#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/verdelimp-erp}"
BRANCH="${BRANCH:-main}"
APP_IMAGE="${APP_IMAGE:-verdelimp-app:latest}"
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-180}"
ROLLBACK_IMAGE=""
OLD_SHA=""

log() {
  echo "[$(date '+%F %T')] $*"
}

wait_for_health() {
  local deadline=$((SECONDS + HEALTH_TIMEOUT_SECONDS))
  local status=""

  while [ "$SECONDS" -lt "$deadline" ]; do
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' verdelimp-erp 2>/dev/null || true)"
    if [ "$status" = "healthy" ]; then
      docker compose exec -T db sh -lc 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null
      return 0
    fi
    sleep 5
  done

  log "Aplicação não ficou saudável. Estado final: ${status:-indisponível}"
  return 1
}

rollback() {
  local line="$1"
  local code="$2"
  trap - ERR

  log "ERRO no deploy, linha $line, código $code. Iniciando rollback da aplicação."

  if [ -n "$ROLLBACK_IMAGE" ] && docker image inspect "$ROLLBACK_IMAGE" >/dev/null 2>&1; then
    docker tag "$ROLLBACK_IMAGE" "$APP_IMAGE"
    docker compose up -d --no-deps app || true
    wait_for_health || true
    log "Imagem anterior restaurada. As migrations não são revertidas automaticamente."
    log "Backup pré-deploy disponível para restauração controlada, se necessária."
  else
    log "Imagem anterior não estava disponível; aplicação atual não foi substituída automaticamente."
  fi

  exit "$code"
}
trap 'rollback "$LINENO" "$?"' ERR

log "Verdelimp ERP — deploy seguro na VPS Contabo"

if [ ! -d "$APP_DIR" ]; then
  echo "Erro: diretório $APP_DIR não existe. Clone o repositório primeiro." >&2
  exit 1
fi

cd "$APP_DIR"

if [ ! -f ".env.production" ]; then
  echo "Erro: .env.production não encontrado." >&2
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Erro: existem alterações locais não versionadas. O deploy foi interrompido para evitar perda de dados." >&2
  git status --short
  exit 1
fi

# O Docker Compose lê variáveis de .env para interpolação.
ln -sf .env.production .env

log "Executando backup integral pré-deploy"
chmod +x deploy/contabo/backup.sh
deploy/contabo/backup.sh "$APP_DIR"

OLD_SHA="$(git rev-parse HEAD)"
OLD_SHORT="$(git rev-parse --short HEAD)"
ROLLBACK_IMAGE="verdelimp-app:rollback-${OLD_SHORT}"

if docker image inspect "$APP_IMAGE" >/dev/null 2>&1; then
  docker tag "$APP_IMAGE" "$ROLLBACK_IMAGE"
  log "Imagem de rollback preservada: $ROLLBACK_IMAGE"
else
  ROLLBACK_IMAGE=""
  log "Primeiro deploy detectado: não existe imagem anterior para rollback."
fi

log "Atualizando código da branch $BRANCH"
git fetch --prune origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"
NEW_SHA="$(git rev-parse HEAD)"

if [ "$OLD_SHA" = "$NEW_SHA" ]; then
  log "Código já estava atualizado; o deploy seguirá para validar build, migrations e saúde."
fi

log "Construindo nova imagem"
docker compose build --pull app

log "Subindo e validando PostgreSQL"
docker compose up -d db
docker compose exec -T db sh -lc 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'

log "Aplicando migrations"
docker compose run --rm migrate

log "Subindo aplicação"
docker compose up -d --no-deps app

log "Aguardando healthcheck"
wait_for_health

log "Validando endpoint interno"
set -a
# shellcheck disable=SC1091
source .env.production
set +a
curl -fsS --max-time 15 "http://127.0.0.1:${APP_PORT:-3010}/api/health" | grep -q '"ok":true'

trap - ERR

log "Deploy concluído com sucesso"
log "Versão anterior: $OLD_SHORT"
log "Versão atual: $(git rev-parse --short HEAD)"
docker compose ps

# Mantém somente a imagem imediatamente anterior para rollback rápido.
docker images 'verdelimp-app:rollback-*' --format '{{.Repository}}:{{.Tag}} {{.CreatedAt}}' \
  | tail -n +2 \
  | awk '{print $1}' \
  | xargs -r docker image rm >/dev/null 2>&1 || true

log "O seed deve ser executado somente na primeira instalação."
