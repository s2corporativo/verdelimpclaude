# deploy.ps1 — Deploy Verde Limp ERP para VPS
# Uso: .\deploy.ps1

$VPS_IP = "IP_DO_VPS"        # ← trocar pelo IP real
$VPS_USER = "root"
$PROJECT_DIR = "/var/www/verdelimp"

Write-Host "🚀 Deploy Verde Limp ERP" -ForegroundColor Green
Write-Host ""

# 1. Conectar e executar
Write-Host "📦 Conectando no VPS..." -ForegroundColor Yellow
ssh "$VPS_USER@$VPS_IP" @"
cd $PROJECT_DIR

echo '📥 Pulling changes...'
git pull origin main

echo '⚙️ Gerando Prisma Client...'
npx prisma generate

echo '🔨 Build de produção...'
npm run build

echo '🔄 Reiniciando servidor...'
if command -v pm2 &> /dev/null; then
    pm2 restart all
    echo '✅ Reiniciado via PM2'
elif command -v docker &> /dev/null && [ -f docker-compose.yml ]; then
    docker compose restart
    echo '✅ Reiniciado via Docker'
elif command -v systemctl &> /dev/null; then
    systemctl restart verdelimp
    echo '✅ Reiniciado via systemd'
else
    echo '⚠️ Não conseguiu reiniciar automaticamente — reinicie manualmente'
fi

echo ''
echo '✅ Deploy concluído!'
"@

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deploy finalizado com sucesso!" -ForegroundColor Green
    Write-Host "🌐 Acesse: http://erp.verdelimp.com.br:3010" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Erro no deploy — verifique o IP e conexão SSH" -ForegroundColor Red
}
