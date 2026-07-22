#!/usr/bin/env bash
# Configura tarefas operacionais do Verdelimp na VPS sem apagar outros crons.
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/verdelimp-erp}"
OPS_ENV="$APP_DIR/.env.ops"
EXAMPLE="$APP_DIR/deploy/contabo/ops-config.example"
LOG_DIR="/var/log/verdelimp"

if [ "$(id -u)" -ne 0 ]; then
  echo "Erro: execute como root para instalar cron e diretórios de log." >&2
  exit 1
fi

cd "$APP_DIR"

if [ ! -f "$OPS_ENV" ]; then
  cp "$EXAMPLE" "$OPS_ENV"
  chmod 600 "$OPS_ENV"
  echo "Arquivo criado: $OPS_ENV"
  echo "Preencha RCLONE_REMOTE e demais parâmetros e execute este script novamente." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$OPS_ENV"
set +a

if [ "${REQUIRE_OFFSITE:-false}" = "true" ]; then
  [ -n "${RCLONE_REMOTE:-}" ] || {
    echo "Erro: REQUIRE_OFFSITE=true exige RCLONE_REMOTE configurado." >&2
    exit 1
  }
  command -v rclone >/dev/null 2>&1 || {
    echo "Erro: instale e configure rclone antes de ativar backup off-site." >&2
    exit 1
  }
  rclone lsd "${RCLONE_REMOTE%/*}" >/dev/null 2>&1 || {
    echo "Erro: remote rclone não pôde ser acessado: $RCLONE_REMOTE" >&2
    exit 1
  }
fi

mkdir -p "$LOG_DIR" "${BACKUP_DIR:-/opt/backups/verdelimp}"
chmod 700 "${BACKUP_DIR:-/opt/backups/verdelimp}"
chmod +x \
  deploy/contabo/backup.sh \
  deploy/contabo/deploy.sh \
  deploy/contabo/monitor.sh \
  deploy/contabo/restore-test.sh

CURRENT_CRON="$(crontab -l 2>/dev/null || true)"
CLEAN_CRON="$(printf '%s\n' "$CURRENT_CRON" | sed '/# BEGIN VERDELIMP OPS/,/# END VERDELIMP OPS/d')"

{
  printf '%s\n' "$CLEAN_CRON"
  cat <<CRON
# BEGIN VERDELIMP OPS
20 2 * * * $APP_DIR/deploy/contabo/backup.sh $APP_DIR >> $LOG_DIR/backup.log 2>&1
*/10 * * * * $APP_DIR/deploy/contabo/monitor.sh $APP_DIR >> $LOG_DIR/monitor.log 2>&1
10 4 1 1,4,7,10 * $APP_DIR/deploy/contabo/restore-test.sh >> $LOG_DIR/restore-test.log 2>&1
# END VERDELIMP OPS
CRON
} | awk 'NF || previous_nf {print} {previous_nf=NF}' | crontab -

logrotate_config="/etc/logrotate.d/verdelimp"
cat > "$logrotate_config" <<'LOGROTATE'
/var/log/verdelimp/*.log {
  weekly
  rotate 12
  compress
  delaycompress
  missingok
  notifempty
  copytruncate
  create 0640 root adm
}
LOGROTATE

crontab -l | sed -n '/# BEGIN VERDELIMP OPS/,/# END VERDELIMP OPS/p'
echo "Operação configurada. Execute agora: $APP_DIR/deploy/contabo/backup.sh"
echo "Depois valide: $APP_DIR/deploy/contabo/restore-test.sh"
