#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/verdelimp-erp"
BRANCH="main"

echo "==> Verdelimp ERP — deploy VPS Contabo"

if [ ! -d "$APP_DIR" ]; then
  echo "Erro: diretório $APP_DIR não existe. Clone o repositório primeiro."
  exit 1
fi

cd "$APP_DIR"

if [ ! -f ".env.production" ]; then
  echo "Erro: .env.production não encontrado. Copie .env.vps.example para .env.production e preencha os valores reais."
  exit 1
fi

echo "==> Atualizando código"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo "==> Build da nova imagem"
docker compose build app

echo "==> Subindo banco"
docker compose up -d db

echo "==> Aplicando migrations (antes de trocar a aplicação)"
docker compose run --rm app npx prisma migrate deploy

echo "==> Subindo aplicação"
docker compose up -d app

echo "==> Status"
docker compose ps

echo "Deploy finalizado. Verifique os logs com: docker compose logs -f app"
echo "Observação: o seed (npm run prisma:seed) deve ser executado APENAS na primeira instalação."
