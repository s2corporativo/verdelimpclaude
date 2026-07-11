# Deploy do Verdelimp ERP em VPS Contabo

Este guia publica o Verdelimp ERP em uma VPS Contabo com Ubuntu, Docker, PostgreSQL local em container, Nginx e SSL.

Arquitetura:

```text
GitHub
  ↓
VPS Contabo Ubuntu
  ↓
Docker Compose
  ↓
Next.js + PostgreSQL
  ↓
Nginx + SSL
  ↓
erp.seudominio.com.br
```

## 1. Requisitos da VPS

Recomendado:

- Ubuntu 22.04 LTS ou 24.04 LTS
- 2 vCPU ou mais
- 4 GB RAM ou mais
- 80 GB SSD ou mais
- domínio apontado para o IP da VPS

## 2. Instalar pacotes básicos

```bash
apt update && apt upgrade -y
apt install -y git curl ufw nginx certbot python3-certbot-nginx ca-certificates gnupg
```

## 3. Instalar Docker

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker
```

Verificar:

```bash
docker --version
docker compose version
```

## 4. Firewall básico

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status
```

## 5. Clonar o repositório

```bash
mkdir -p /opt
cd /opt
git clone https://github.com/s2corporativo/verdelimpclaude.git verdelimp-erp
cd /opt/verdelimp-erp
```

Se o repositório for privado, use autenticação do GitHub via token ou SSH deploy key.

## 6. Criar variáveis de ambiente

```bash
cp .env.vps.example .env.production
nano .env.production
```

Preencha pelo menos:

```env
POSTGRES_PASSWORD=senha_forte_aqui
NEXTAUTH_URL=https://erp.seudominio.com.br
NEXTAUTH_SECRET=gere_uma_string_forte
SEED_ADMIN_PASSWORD=senha_inicial_dos_usuarios
GROQ_API_KEY=chave_do_console_groq
```

A `GROQ_API_KEY` (plano gratuito em https://console.groq.com) habilita os recursos de IA:
proposta por edital, análise de licitação/preço, cronograma, plano logístico, chat de
ajuda e transcrição de voz. Sem ela, o restante do ERP funciona normalmente.

Para gerar segredo:

```bash
openssl rand -base64 32
```

Não envie `.env.production` para o GitHub.

## 7. Subir banco e aplicação

```bash
docker compose build app
docker compose up -d db
docker compose run --rm app npx prisma migrate deploy
docker compose up -d app
```

Popular dados iniciais (**apenas na primeira instalação**, com `SEED_ADMIN_PASSWORD` definida no `.env.production`):

```bash
docker compose exec app npm run prisma:seed
```

Ver logs:

```bash
docker compose logs -f app
```

A aplicação ficará localmente em:

```text
http://127.0.0.1:3000
```

## 8. Configurar Nginx

Copie o arquivo de exemplo:

```bash
cp deploy/contabo/nginx-verdelimp.conf /etc/nginx/sites-available/verdelimp-erp
nano /etc/nginx/sites-available/verdelimp-erp
```

Troque:

```text
erp.seudominio.com.br
```

pelo domínio real, por exemplo:

```text
erp.verdelimp.com.br
```

Ative:

```bash
ln -s /etc/nginx/sites-available/verdelimp-erp /etc/nginx/sites-enabled/verdelimp-erp
nginx -t
systemctl reload nginx
```

## 9. Emitir SSL

```bash
certbot --nginx -d erp.seudominio.com.br
```

Testar renovação:

```bash
certbot renew --dry-run
```

## 10. Atualizar o sistema depois

Use o script:

```bash
chmod +x deploy/contabo/deploy.sh
./deploy/contabo/deploy.sh
```

Ou manualmente:

```bash
cd /opt/verdelimp-erp
git pull origin main
docker compose build app
docker compose run --rm app npx prisma migrate deploy
docker compose up -d app
```

O seed **não** deve ser executado em atualizações — apenas na primeira instalação.

## 11. Backup do banco

Backup manual:

```bash
docker compose exec db pg_dump -U verdelimp verdelimp_erp > backup_verdelimp_$(date +%F).sql
```

Restaurar backup:

```bash
cat backup_verdelimp_YYYY-MM-DD.sql | docker compose exec -T db psql -U verdelimp verdelimp_erp
```

Backup automático diário (cron do root na VPS):

```bash
mkdir -p /opt/backups
crontab -e
# adicionar a linha (todo dia às 02h, mantém 14 dias):
0 2 * * * cd /opt/verdelimp-erp && docker compose exec -T db pg_dump -U verdelimp verdelimp_erp | gzip > /opt/backups/verdelimp_$(date +\%F).sql.gz && find /opt/backups -name 'verdelimp_*.sql.gz' -mtime +14 -delete
```

Recomenda-se também copiar os backups para fora da VPS (rclone para Google Drive/S3, por exemplo) — se a VPS falhar, o backup local se perde junto.

## 12. Segurança obrigatória

Nunca subir para GitHub:

- `.env.production`
- certificados digitais
- XMLs reais
- documentos de funcionários
- contratos reais
- comprovantes bancários
- chaves de API
- senha do banco

Para produção, mantenha:

- SSH protegido
- firewall ativo
- Nginx com SSL
- backups externos
- usuários com senha forte
- acesso ao ERP com login
- módulos fiscais em homologação até validação contábil

## 13. Comandos úteis

Status:

```bash
docker compose ps
```

Logs app:

```bash
docker compose logs -f app
```

Logs banco:

```bash
docker compose logs -f db
```

Reiniciar app:

```bash
docker compose restart app
```

Parar tudo:

```bash
docker compose down
```

Subir tudo:

```bash
docker compose up -d
```

## 14. Observação fiscal

O sistema opera como apoio gerencial. Transmissões oficiais para SEFAZ, Receita Federal, eSocial, EFD-Reinf ou NFS-e Nacional não devem ser ativadas sem certificado digital, homologação, contador responsável, validação técnica e autorização expressa.
