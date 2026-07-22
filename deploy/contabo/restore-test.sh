#!/usr/bin/env bash
# Ensaio de restauração do último backup sem substituir o banco de produção.
# Cria um banco temporário no PostgreSQL existente, restaura, valida e remove.
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/verdelimp-erp}"
OPS_ENV="${OPS_ENV:-$APP_DIR/.env.ops}"

if [ -f "$OPS_ENV" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$OPS_ENV"
  set +a
fi

BACKUP_DIR="${BACKUP_DIR:-/opt/backups/verdelimp}"
DB_FILE="${1:-}"
UPLOAD_FILE="${2:-}"
TEST_DB="verdelimp_restore_test_$(date +%s)"
TMP_DIR=""
DB_CREATED=false

cleanup() {
  set +e
  [ -n "$TMP_DIR" ] && rm -rf "$TMP_DIR"
  if [ "$DB_CREATED" = "true" ]; then
    docker compose exec -T db dropdb --if-exists -U "$DB_USER" "$TEST_DB" >/dev/null 2>&1
  fi
}
trap cleanup EXIT

cd "$APP_DIR"

if [ -z "$DB_FILE" ]; then
  DB_FILE="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'verdelimp_*.sql.gz' -printf '%T@ %p\n' | sort -nr | awk 'NR==1 {$1=""; sub(/^ /, ""); print}')"
fi

if [ -z "$UPLOAD_FILE" ]; then
  UPLOAD_FILE="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'uploads_*.tar.gz' -printf '%T@ %p\n' | sort -nr | awk 'NR==1 {$1=""; sub(/^ /, ""); print}')"
fi

[ -f "$DB_FILE" ] || { echo "Erro: backup de banco não encontrado." >&2; exit 1; }
[ -f "$UPLOAD_FILE" ] || { echo "Erro: backup de uploads não encontrado." >&2; exit 1; }

gzip -t "$DB_FILE"
tar -tzf "$UPLOAD_FILE" >/dev/null

DB_USER="$(docker compose exec -T db printenv POSTGRES_USER | tr -d '\r')"
[ -n "$DB_USER" ] || { echo "Erro: POSTGRES_USER não pôde ser obtido." >&2; exit 1; }

echo "Criando banco temporário: $TEST_DB"
docker compose exec -T db createdb -U "$DB_USER" "$TEST_DB"
DB_CREATED=true

echo "Restaurando dump no banco temporário..."
gunzip -c "$DB_FILE" \
  | docker compose exec -T db psql -v ON_ERROR_STOP=1 -U "$DB_USER" "$TEST_DB" >/dev/null

TABLE_COUNT="$(docker compose exec -T db psql -At -U "$DB_USER" "$TEST_DB" -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" | tr -d '\r')"
MIGRATION_COUNT="$(docker compose exec -T db psql -At -U "$DB_USER" "$TEST_DB" -c 'SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL;' | tr -d '\r')"

if [ "${TABLE_COUNT:-0}" -lt 10 ]; then
  echo "Erro: restauração criou apenas ${TABLE_COUNT:-0} tabelas." >&2
  exit 1
fi

if [ "${MIGRATION_COUNT:-0}" -lt 1 ]; then
  echo "Erro: histórico de migrations não foi restaurado." >&2
  exit 1
fi

echo "Extraindo uploads em diretório temporário para validar leitura..."
TMP_DIR="$(mktemp -d)"
tar -xzf "$UPLOAD_FILE" -C "$TMP_DIR"
UPLOAD_ENTRIES="$(find "$TMP_DIR" -mindepth 1 | wc -l | tr -d ' ')"

printf 'OK: restauração validada. Tabelas=%s, migrations=%s, entradas de uploads=%s.\n' \
  "$TABLE_COUNT" "$MIGRATION_COUNT" "$UPLOAD_ENTRIES"
