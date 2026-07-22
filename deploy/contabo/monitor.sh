#!/usr/bin/env bash
# Monitor operacional do Verdelimp ERP.
# Verifica aplicação, banco, endpoint de saúde, disco e idade do último backup.
set -Eeuo pipefail

APP_DIR="${1:-/opt/verdelimp-erp}"
OPS_ENV="${OPS_ENV:-$APP_DIR/.env.ops}"

if [ ! -d "$APP_DIR" ]; then
  echo "Erro: diretório do ERP não encontrado: $APP_DIR" >&2
  exit 1
fi

cd "$APP_DIR"

if [ -f ".env.production" ]; then
  set -a
  # shellcheck disable=SC1091
  source .env.production
  set +a
fi

if [ -f "$OPS_ENV" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$OPS_ENV"
  set +a
fi

BACKUP_DIR="${BACKUP_DIR:-/opt/backups/verdelimp}"
BACKUP_MAX_AGE_HOURS="${BACKUP_MAX_AGE_HOURS:-30}"
DISK_ALERT_PERCENT="${DISK_ALERT_PERCENT:-85}"
ALERT_WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"
MONITOR_HEARTBEAT_URL="${MONITOR_HEARTBEAT_URL:-}"
APP_PORT="${APP_PORT:-3010}"
HOSTNAME_CURTO="$(hostname -s 2>/dev/null || hostname)"
FAILURES=()

send_alert() {
  local message="$1"
  [ -z "$ALERT_WEBHOOK_URL" ] && return 0
  curl -fsS --max-time 15 \
    -H 'Content-Type: application/json' \
    -d "{\"text\":\"${message//\"/\\\"}\"}" \
    "$ALERT_WEBHOOK_URL" >/dev/null || true
}

check_running() {
  local service="$1"
  if ! docker compose ps --status running --quiet "$service" | grep -q .; then
    FAILURES+=("serviço ${service} não está em execução")
  fi
}

check_running db
check_running app

APP_HEALTH="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' verdelimp-erp 2>/dev/null || true)"
if [ "$APP_HEALTH" != "healthy" ]; then
  FAILURES+=("container da aplicação está ${APP_HEALTH:-indisponível}")
fi

if ! curl -fsS --max-time 15 "http://127.0.0.1:${APP_PORT}/api/health" | grep -q '"ok":true'; then
  FAILURES+=("endpoint /api/health não respondeu corretamente")
fi

if ! docker compose exec -T db sh -lc 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null 2>&1; then
  FAILURES+=("PostgreSQL não respondeu ao pg_isready")
fi

DISK_USED="$(df -P "$APP_DIR" | awk 'NR==2 {gsub(/%/, "", $5); print $5}')"
if [ -z "$DISK_USED" ] || [ "$DISK_USED" -ge "$DISK_ALERT_PERCENT" ]; then
  FAILURES+=("uso de disco em ${DISK_USED:-desconhecido}% (limite ${DISK_ALERT_PERCENT}%)")
fi

LATEST_DB="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'verdelimp_*.sql.gz' -printf '%T@ %p\n' 2>/dev/null | sort -nr | awk 'NR==1 {$1=""; sub(/^ /, ""); print}' || true)"
LATEST_UPLOAD="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'uploads_*.tar.gz' -printf '%T@ %p\n' 2>/dev/null | sort -nr | awk 'NR==1 {$1=""; sub(/^ /, ""); print}' || true)"

if [ -z "$LATEST_DB" ]; then
  FAILURES+=("nenhum backup de banco localizado em $BACKUP_DIR")
else
  AGE_HOURS=$(( ($(date +%s) - $(stat -c %Y "$LATEST_DB")) / 3600 ))
  if [ "$AGE_HOURS" -gt "$BACKUP_MAX_AGE_HOURS" ]; then
    FAILURES+=("backup do banco está com ${AGE_HOURS}h (máximo ${BACKUP_MAX_AGE_HOURS}h)")
  elif ! gzip -t "$LATEST_DB" >/dev/null 2>&1; then
    FAILURES+=("último backup do banco está corrompido")
  fi
fi

if [ -z "$LATEST_UPLOAD" ]; then
  FAILURES+=("nenhum backup de uploads localizado em $BACKUP_DIR")
elif ! tar -tzf "$LATEST_UPLOAD" >/dev/null 2>&1; then
  FAILURES+=("último backup de uploads está corrompido")
fi

if [ "${#FAILURES[@]}" -gt 0 ]; then
  MESSAGE="Verdelimp em ${HOSTNAME_CURTO}: ${FAILURES[*]}"
  echo "FALHA: $MESSAGE" >&2
  send_alert "$MESSAGE"
  exit 1
fi

if [ -n "$MONITOR_HEARTBEAT_URL" ]; then
  curl -fsS --max-time 15 "$MONITOR_HEARTBEAT_URL" >/dev/null
fi

echo "OK: aplicação, banco, endpoint, disco e backups estão regulares em ${HOSTNAME_CURTO}."
