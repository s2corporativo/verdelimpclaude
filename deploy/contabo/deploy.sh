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

echo "==> Subindo banco"
docker compose up -d db

echo "==> Build e subida da aplicação"
docker compose up -d --build app

echo "==> Prisma generate"
docker compose exec app npx prisma generate

echo "==> Aplicando schema Prisma"
docker compose exec app npx prisma db push

echo "==> Rodando seed"
docker compose exec app npm run prisma:seed || true

echo "==> Reiniciando aplicação"
docker compose restart app

echo "==> Status"
docker compose ps

echo "Deploy finalizado. Verifique os logs com: docker compose logs -f app"
