#!/usr/bin/env bash
# Bootstrap seguro da primeira instalação do Verdelimp ERP v2.3.
# Pré-requisitos: Docker Compose, Nginx, .env.production e .env.ops preparados.
set -Eeuo pipefail

log() { echo "[$(date '+%F %T')] $*"; }
fail() { echo "Erro: $*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || fail "execute como root"

APP_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$APP_DIR"

for command_name in git docker curl nginx; do
  command -v "$command_name" >/dev/null 2>&1 || fail "comando obrigatório ausente: $command_name"
done
docker compose version >/dev/null 2>&1 || fail "Docker Compose não está disponível"

[ -f .env.production ] || fail "crie .env.production a partir de .env.vps.example"
[ -f .env.ops ] || fail "crie .env.ops a partir de deploy/contabo/ops-config.example"
chmod 600 .env.production .env.ops
ln -sf .env.production .env

set -a
# shellcheck disable=SC1091
source .env.production
# shellcheck disable=SC1091
source .env.ops
set +a

[ -n "${POSTGRES_PASSWORD:-}" ] || fail "POSTGRES_PASSWORD não definido"
[ "$POSTGRES_PASSWORD" != "troque_por_uma_senha_forte" ] || fail "POSTGRES_PASSWORD ainda contém o valor de exemplo"
[ -n "${NEXTAUTH_SECRET:-}" ] || fail "NEXTAUTH_SECRET não definido"
[ "$NEXTAUTH_SECRET" != "gere_uma_string_forte_com_openssl_rand_base64_32" ] || fail "NEXTAUTH_SECRET ainda contém o valor de exemplo"
[[ "${NEXTAUTH_URL:-}" =~ ^https:// ]] || fail "NEXTAUTH_URL deve usar HTTPS"
[ -n "${SEED_ADMIN_PASSWORD:-}" ] || fail "SEED_ADMIN_PASSWORD não definido para a primeira instalação"

if [ "${REQUIRE_OFFSITE:-false}" = "true" ]; then
  [ -n "${RCLONE_REMOTE:-}" ] || fail "RCLONE_REMOTE é obrigatório"
  [ "$RCLONE_REMOTE" != "gdrive:backups/verdelimp" ] || fail "RCLONE_REMOTE ainda contém o valor de exemplo"
fi

log "Verificando VPS compartilhada"
ss -tlnp | grep LISTEN || true
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' || true

log "Construindo aplicação, migration e seed"
docker compose build --pull app migrate seed

log "Subindo PostgreSQL"
docker compose up -d db
for _ in $(seq 1 30); do
  status="$(docker inspect --format '{{.State.Health.Status}}' verdelimp-db 2>/dev/null || true)"
  [ "$status" = "healthy" ] && break
  sleep 2
done
[ "$(docker inspect --format '{{.State.Health.Status}}' verdelimp-db 2>/dev/null)" = "healthy" ] \
  || fail "PostgreSQL não ficou saudável"

log "Aplicando migrations"
docker compose run --rm migrate

if [ ! -f .verdelimp-seeded ]; then
  log "Executando seed inicial"
  docker compose run --rm seed
  touch .verdelimp-seeded
  chmod 600 .verdelimp-seeded
else
  log "Seed inicial já registrado; etapa preservada"
fi

log "Subindo aplicação"
docker compose up -d app
for _ in $(seq 1 36); do
  status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' verdelimp-erp 2>/dev/null || true)"
  [ "$status" = "healthy" ] && break
  sleep 5
done
[ "$(docker inspect --format '{{.State.Health.Status}}' verdelimp-erp 2>/dev/null)" = "healthy" ] \
  || fail "aplicação não ficou saudável"

curl -fsS --max-time 15 "http://127.0.0.1:${APP_PORT:-3010}/api/health" | grep -q '"ok":true' \
  || fail "endpoint /api/health falhou"

DOMAIN="${NEXTAUTH_URL#https://}"
DOMAIN="${DOMAIN%%/*}"
SITE="/etc/nginx/sites-available/verdelimp-erp"

log "Configurando site Nginx adicional"
sed -e "s|erp.seudominio.com.br|$DOMAIN|g" \
    -e "s|127.0.0.1:3010|127.0.0.1:${APP_PORT:-3010}|g" \
    deploy/contabo/nginx-verdelimp.conf > "$SITE"
ln -sf "$SITE" /etc/nginx/sites-enabled/verdelimp-erp
nginx -t || {
  rm -f /etc/nginx/sites-enabled/verdelimp-erp
  fail "nginx -t falhou; configuração do ERP foi desativada"
}
systemctl reload nginx

log "Configurando rotinas operacionais"
chmod +x deploy/contabo/*.sh
deploy/contabo/configure-operations.sh

log "Executando backup inicial e ensaio de restauração"
deploy/contabo/backup.sh
deploy/contabo/restore-test.sh

log "Validação final"
deploy/contabo/monitor.sh
docker compose ps
curl -fsS "http://127.0.0.1:${APP_PORT:-3010}/api/health"

log "Instalação técnica concluída. A liberação funcional depende de HOMOLOGACAO_PRODUCAO.md."
