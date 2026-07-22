#!/usr/bin/env bash
# Backup completo do Verdelimp ERP: PostgreSQL + volume de uploads + checksums
# + cópia off-site opcional/obrigatória.
#
# Uso:
#   ./deploy/contabo/backup.sh [diretorio_do_app]
#
# Variáveis operacionais podem ficar em /opt/verdelimp-erp/.env.ops:
#   BACKUP_DIR=/opt/backups/verdelimp
#   RETENCAO_DIAS=14
#   RCLONE_REMOTE=gdrive:backups/verdelimp
#   REQUIRE_OFFSITE=true
#   BACKUP_HEARTBEAT_URL=
#   ALERT_WEBHOOK_URL=
set -Eeuo pipefail

APP_DIR="${1:-/opt/verdelimp-erp}"
OPS_ENV="${OPS_ENV:-$APP_DIR/.env.ops}"

if [ -f "$OPS_ENV" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$OPS_ENV"
  set +a
fi

BACKUP_DIR="${BACKUP_DIR:-/opt/backups/verdelimp}"
RETENCAO_DIAS="${RETENCAO_DIAS:-14}"
RCLONE_REMOTE="${RCLONE_REMOTE:-}"
REQUIRE_OFFSITE="${REQUIRE_OFFSITE:-false}"
BACKUP_HEARTBEAT_URL="${BACKUP_HEARTBEAT_URL:-}"
ALERT_WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-verdelimp}"
TIMESTAMP="$(date +%F_%H-%M-%S)"
HOSTNAME_CURTO="$(hostname -s 2>/dev/null || hostname)"
DB_FILE="$BACKUP_DIR/verdelimp_${TIMESTAMP}.sql.gz"
UPLOAD_FILE="$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz"
MANIFEST_FILE="$BACKUP_DIR/manifest_${TIMESTAMP}.sha256"

send_alert() {
  local message="$1"
  [ -z "$ALERT_WEBHOOK_URL" ] && return 0
  curl -fsS --max-time 15 \
    -H 'Content-Type: application/json' \
    -d "{\"text\":\"${message//\"/\\\"}\"}" \
    "$ALERT_WEBHOOK_URL" >/dev/null || true
}

on_error() {
  local line="$1"
  local code="$2"
  send_alert "Verdelimp: falha no backup em ${HOSTNAME_CURTO}, linha ${line}, código ${code}."
  echo "[$(date '+%F %T')] ERRO — backup interrompido na linha $line (código $code)." >&2
  exit "$code"
}
trap 'on_error "$LINENO" "$?"' ERR

if [ ! -d "$APP_DIR" ] || [ ! -f "$APP_DIR/docker-compose.yml" ]; then
  echo "Erro: diretório do ERP inválido: $APP_DIR" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
cd "$APP_DIR"

if ! docker compose ps db --status running --quiet | grep -q .; then
  echo "Erro: banco do Verdelimp não está em execução." >&2
  exit 1
fi

echo "[$(date '+%F %T')] Backup do PostgreSQL..."
docker compose exec -T db sh -lc 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  | gzip -9 > "$DB_FILE"

gzip -t "$DB_FILE"
[ -s "$DB_FILE" ] || { echo "Erro: dump do banco ficou vazio." >&2; exit 1; }

echo "[$(date '+%F %T')] Localizando volume real de uploads..."
UPLOAD_VOLUME="$(
  docker volume ls -q \
    --filter "label=com.docker.compose.project=${COMPOSE_PROJECT_NAME}" \
    --filter "label=com.docker.compose.volume=verdelimp_uploads" \
    | head -n 1
)"

if [ -z "$UPLOAD_VOLUME" ]; then
  echo "Erro: volume de uploads do Compose não foi localizado." >&2
  exit 1
fi

echo "[$(date '+%F %T')] Backup dos uploads: $UPLOAD_VOLUME"
docker run --rm \
  -v "$UPLOAD_VOLUME:/uploads:ro" \
  -v "$BACKUP_DIR:/backup" \
  alpine:3.20 \
  tar -czf "/backup/$(basename "$UPLOAD_FILE")" -C / uploads

tar -tzf "$UPLOAD_FILE" >/dev/null
[ -s "$UPLOAD_FILE" ] || { echo "Erro: arquivo de uploads ficou vazio." >&2; exit 1; }

sha256sum "$DB_FILE" "$UPLOAD_FILE" > "$MANIFEST_FILE"
sha256sum -c "$MANIFEST_FILE"

if [ -n "$RCLONE_REMOTE" ]; then
  command -v rclone >/dev/null 2>&1 || {
    echo "Erro: RCLONE_REMOTE foi definido, mas rclone não está instalado." >&2
    exit 1
  }

  echo "[$(date '+%F %T')] Cópia off-site para $RCLONE_REMOTE"
  rclone copy "$DB_FILE" "$RCLONE_REMOTE/" --checksum --transfers 2
  rclone copy "$UPLOAD_FILE" "$RCLONE_REMOTE/" --checksum --transfers 2
  rclone copy "$MANIFEST_FILE" "$RCLONE_REMOTE/" --checksum --transfers 2

  rclone lsf "$RCLONE_REMOTE/$(basename "$DB_FILE")" | grep -q .
  rclone lsf "$RCLONE_REMOTE/$(basename "$UPLOAD_FILE")" | grep -q .
  rclone lsf "$RCLONE_REMOTE/$(basename "$MANIFEST_FILE")" | grep -q .

  rclone delete "$RCLONE_REMOTE/" --min-age "$((RETENCAO_DIAS * 2))d" || true
elif [ "$REQUIRE_OFFSITE" = "true" ]; then
  echo "Erro: cópia off-site é obrigatória, mas RCLONE_REMOTE não foi definido." >&2
  exit 1
else
  echo "[$(date '+%F %T')] AVISO: backup apenas local; configure RCLONE_REMOTE."
fi

echo "[$(date '+%F %T')] Aplicando retenção local de ${RETENCAO_DIAS} dias..."
find "$BACKUP_DIR" -type f \
  \( -name 'verdelimp_*.sql.gz' -o -name 'uploads_*.tar.gz' -o -name 'manifest_*.sha256' \) \
  -mtime +"$RETENCAO_DIAS" -delete

if [ -n "$BACKUP_HEARTBEAT_URL" ]; then
  curl -fsS --max-time 15 "$BACKUP_HEARTBEAT_URL" >/dev/null
fi

send_alert "Verdelimp: backup concluído em ${HOSTNAME_CURTO} (${TIMESTAMP})."
echo "[$(date '+%F %T')] OK — banco, uploads e checksum gerados."
ls -lh "$DB_FILE" "$UPLOAD_FILE" "$MANIFEST_FILE"
