#!/usr/bin/env bash
# Verdelimp ERP — instalação AUTOMÁTICA em VPS (primeira vez) — idempotente.
# Feito para VPS COMPARTILHADA (EJC, S2, site do escritório): não toca nos
# sites/containers existentes; instala pacotes só se faltarem; Nginx entra
# como site adicional e só recarrega se `nginx -t` passar.
#
# Uso (como root, de dentro do clone do repositório):
#   chmod +x deploy/contabo/install.sh
#   ./deploy/contabo/install.sh
#
# Pode ser re-executado com segurança: o que já estiver feito é pulado.
# Variáveis opcionais (para rodar sem perguntas):
#   DOMAIN=erp.verdelimp.com.br CERT_EMAIL=voce@email.com \
#   SEED_ADMIN_PASSWORD=... GROQ_API_KEY=... ./deploy/contabo/install.sh
set -euo pipefail

say()  { echo -e "\n\033[1;32m==> $*\033[0m"; }
warn() { echo -e "\033[1;33mAVISO: $*\033[0m"; }
die()  { echo -e "\033[1;31mERRO: $*\033[0m" >&2; exit 1; }

[ "$(id -u)" = "0" ] || die "Execute como root (sudo -i)."

# Diretório do repositório = duas pastas acima deste script
APP_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$APP_DIR"
[ -f "docker-compose.yml" ] || die "docker-compose.yml não encontrado em $APP_DIR — rode de dentro do clone do repositório."
say "Instalando a partir de: $APP_DIR"

# ── 0. Pré-voo em VPS compartilhada ─────────────────────────────────
say "Pré-voo: portas, memória e sites existentes"
echo "Portas em escuta (não usaremos nenhuma delas):"
ss -tlnp | grep LISTEN | awk '{print "  " $4 "  " $6}' || true

porta_livre() { ! ss -tln | awk '{print $4}' | grep -qE "[:.]$1\$"; }
APP_PORT="${APP_PORT:-3010}"
while ! porta_livre "$APP_PORT"; do
  warn "Porta $APP_PORT ocupada — tentando a próxima."
  APP_PORT=$((APP_PORT + 1))
done
say "Porta escolhida para o ERP (somente 127.0.0.1): $APP_PORT"

MEM_DISPONIVEL_MB=$(awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo)
SWAP_TOTAL_MB=$(awk '/SwapTotal/ {print int($2/1024)}' /proc/meminfo)
if [ "$MEM_DISPONIVEL_MB" -lt 2048 ] && [ "$SWAP_TOTAL_MB" -lt 1024 ]; then
  say "Memória disponível ${MEM_DISPONIVEL_MB}MB < 2GB e sem swap — criando swap de 2GB (protege EJC/S2 durante o build)"
  if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
    grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  else
    swapon /swapfile 2>/dev/null || true
  fi
fi

# ── 1. Pacotes básicos (instala apenas o que faltar) ────────────────
say "Pacotes básicos"
FALTANDO=""
for p in git curl nginx certbot; do command -v "$p" >/dev/null || FALTANDO="$FALTANDO $p"; done
command -v certbot >/dev/null || FALTANDO="$FALTANDO python3-certbot-nginx"
dpkg -s python3-certbot-nginx >/dev/null 2>&1 || FALTANDO="$FALTANDO python3-certbot-nginx"
if [ -n "$FALTANDO" ]; then
  apt-get update -qq
  # shellcheck disable=SC2086
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq $FALTANDO ca-certificates gnupg
else
  echo "  git, nginx e certbot já instalados — nada a fazer."
fi

# ── 2. Docker (pula se já existir — provável, por causa do EJC/S2) ──
say "Docker"
if docker --version >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  echo "  Docker já instalado: $(docker --version)"
else
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker && systemctl start docker
fi

# ── 3. Perguntas (só o que não veio por variável de ambiente) ───────
IP_PUBLICO=$(curl -fsS -4 --max-time 8 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')
DOMINIO_SUGERIDO="erp.${IP_PUBLICO}.sslip.io"

if [ -z "${DOMAIN:-}" ]; then
  echo ""
  echo "Qual domínio o ERP vai usar? (o DNS já deve apontar para $IP_PUBLICO)"
  echo "Se ainda não configurou DNS, aperte ENTER para usar $DOMINIO_SUGERIDO"
  echo "(sslip.io resolve automaticamente para o IP — funciona na hora, inclusive com SSL)"
  read -r -p "Domínio [$DOMINIO_SUGERIDO]: " DOMAIN
  DOMAIN="${DOMAIN:-$DOMINIO_SUGERIDO}"
fi

if [ -z "${CERT_EMAIL:-}" ]; then
  read -r -p "E-mail para avisos do certificado SSL (ENTER para pular): " CERT_EMAIL || true
fi

if [ ! -f .env.production ] && [ -z "${SEED_ADMIN_PASSWORD:-}" ]; then
  SEED_ADMIN_PASSWORD="Vl$(openssl rand -base64 9 | tr -dc 'a-zA-Z0-9' | head -c 10)@$(shuf -i 10-99 -n 1)"
  SENHA_GERADA=1
fi

if [ ! -f .env.production ] && [ -z "${GROQ_API_KEY:-}" ]; then
  read -r -p "Chave GROQ (console.groq.com, gratuita) — ENTER para configurar depois: " GROQ_API_KEY || true
fi

# ── 4. .env.production (cria só se não existir) ─────────────────────
say "Arquivo .env.production"
if [ -f .env.production ]; then
  echo "  Já existe — mantido como está (modo atualização)."
  APP_PORT=$(grep -E '^APP_PORT=' .env.production | cut -d= -f2 || echo "$APP_PORT")
  APP_PORT="${APP_PORT:-3010}"
  DOMAIN=$(grep -E '^NEXTAUTH_URL=' .env.production | sed 's|.*https\?://||' || echo "$DOMAIN")
else
  POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 28)
  NEXTAUTH_SECRET=$(openssl rand -base64 32)
  cp .env.vps.example .env.production
  sed -i \
    -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$POSTGRES_PASSWORD|" \
    -e "s|^NEXTAUTH_URL=.*|NEXTAUTH_URL=https://$DOMAIN|" \
    -e "s|^NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=$NEXTAUTH_SECRET|" \
    -e "s|^APP_PORT=.*|APP_PORT=$APP_PORT|" \
    -e "s|^SEED_ADMIN_PASSWORD=.*|SEED_ADMIN_PASSWORD=$SEED_ADMIN_PASSWORD|" \
    -e "s|^GROQ_API_KEY=.*|GROQ_API_KEY=${GROQ_API_KEY:-}|" \
    .env.production
  chmod 600 .env.production
  echo "  Criado com segredos gerados automaticamente (POSTGRES_PASSWORD e NEXTAUTH_SECRET)."
fi

# O docker compose só lê variáveis de interpolação (ex.: ${POSTGRES_PASSWORD})
# de um arquivo chamado .env — aponte-o para o .env.production
ln -sf .env.production .env

# ── 5. Build e subida (banco → migrations → app) ────────────────────
say "Build da aplicação (pode levar alguns minutos)"
docker compose build app

say "Subindo o banco"
docker compose up -d db
echo -n "  Aguardando o Postgres ficar saudável"
for _ in $(seq 1 30); do
  ESTADO=$(docker inspect --format '{{.State.Health.Status}}' verdelimp-db 2>/dev/null || echo starting)
  [ "$ESTADO" = "healthy" ] && break
  echo -n "."; sleep 2
done
echo ""
[ "$(docker inspect --format '{{.State.Health.Status}}' verdelimp-db 2>/dev/null)" = "healthy" ] || die "Banco não ficou saudável — veja: docker compose logs db"

say "Aplicando migrations"
docker compose run --rm app npx prisma migrate deploy

say "Subindo a aplicação"
docker compose up -d app

# ── 6. Seed (APENAS na primeira instalação) ─────────────────────────
if [ ! -f .verdelimp-seeded ]; then
  say "Populando dados iniciais (usuários, papéis, permissões)"
  docker compose exec -T app npm run prisma:seed
  touch .verdelimp-seeded
else
  echo "  Seed já executado anteriormente — pulado (correto em atualizações)."
fi

# ── 7. Nginx — site ADICIONAL, sem tocar nos existentes ─────────────
say "Nginx (site adicional ao lado de EJC/S2/escritório)"
SITE=/etc/nginx/sites-available/verdelimp-erp
if [ ! -f "$SITE" ]; then
  sed -e "s|erp.seudominio.com.br|$DOMAIN|g" -e "s|127.0.0.1:3010|127.0.0.1:$APP_PORT|g" \
    deploy/contabo/nginx-verdelimp.conf > "$SITE"
  ln -sf "$SITE" /etc/nginx/sites-enabled/verdelimp-erp
  if nginx -t; then
    systemctl reload nginx
  else
    rm -f /etc/nginx/sites-enabled/verdelimp-erp
    die "nginx -t falhou — site do ERP DESATIVADO para não afetar os sites existentes. Corrija e rode de novo."
  fi
else
  echo "  Site já configurado — mantido."
  nginx -t && systemctl reload nginx
fi

# Firewall: só ajusta se o UFW já estiver ativo (nunca ativa sozinho)
if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  ufw status | grep -qi 'Nginx Full\|443' || { warn "UFW ativo sem regra para HTTPS — liberando 'Nginx Full'."; ufw allow 'Nginx Full'; }
fi

# ── 8. SSL com Certbot (pula se o certificado já existir) ───────────
say "Certificado SSL"
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  echo "  Certificado para $DOMAIN já existe — mantido."
else
  if [ -n "${CERT_EMAIL:-}" ]; then
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$CERT_EMAIL" --redirect \
      || warn "Certbot falhou (DNS ainda propagando?). Rode depois: certbot --nginx -d $DOMAIN"
  else
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect \
      || warn "Certbot falhou (DNS ainda propagando?). Rode depois: certbot --nginx -d $DOMAIN"
  fi
fi

# ── 9. Backup diário (02h20, deslocado dos outros sistemas) ─────────
say "Backup automático do banco"
mkdir -p /opt/backups
LINHA_CRON="20 2 * * * cd $APP_DIR && docker compose exec -T db pg_dump -U verdelimp verdelimp_erp | gzip > /opt/backups/verdelimp_\$(date +\%F).sql.gz && find /opt/backups -name 'verdelimp_*.sql.gz' -mtime +14 -delete"
( crontab -l 2>/dev/null | grep -v 'verdelimp_.*\.sql\.gz' ; echo "$LINHA_CRON" ) | crontab -
echo "  Cron instalado: todo dia às 02h20, mantém 14 dias em /opt/backups."

# ── 10. Verificação final ───────────────────────────────────────────
say "Verificação final"
sleep 3
SAUDE=$(curl -fsS --max-time 15 "http://127.0.0.1:$APP_PORT/api/health" || echo FALHOU)
echo "  /api/health local: $SAUDE"
echo "$SAUDE" | grep -q '"ok":true' || warn "Health check não respondeu ok — veja: docker compose logs -f app"
echo ""
echo "  Containers do ERP:"
docker compose ps --format '  {{.Name}}  {{.Status}}' 2>/dev/null || docker compose ps
echo ""
echo "  Confirme que os OUTROS sites (EJC, S2, escritório) continuam no ar."

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  ✅ VERDELIMP ERP PUBLICADO"
echo "═══════════════════════════════════════════════════════════════"
echo "  URL:      https://$DOMAIN"
echo "  Login:    admin@verdelimp.com.br"
if [ "${SENHA_GERADA:-0}" = "1" ]; then
  echo "  Senha:    $SEED_ADMIN_PASSWORD   ← ANOTE e troque no menu Alterar Senha"
else
  echo "  Senha:    a SEED_ADMIN_PASSWORD definida no .env.production"
fi
echo ""
echo "  Atualizações futuras: cd $APP_DIR && ./deploy/contabo/deploy.sh"
echo "═══════════════════════════════════════════════════════════════"
