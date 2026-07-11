# Deploy do Verdelimp ERP em VPS Contabo

Este guia publica o Verdelimp ERP em uma VPS Contabo com Ubuntu, Docker, PostgreSQL local em container, Nginx e SSL.

> **⚠️ VPS COMPARTILHADA**: esta VPS também hospeda o **EJC**, o **S2** e o **site do escritório**.
> Todos os passos abaixo foram desenhados para NÃO interferir no que já está no ar:
> o ERP usa a porta local **3010** (configurável via `APP_PORT`), containers/volumes com
> prefixo `verdelimp`, Postgres interno sem porta exposta no host e um site Nginx
> adicional — os sites existentes não são tocados.

## ⚡ Opção A — Instalação automática (recomendada)

Todo o roteiro abaixo (pré-voo, pacotes, Docker, banco, migrations, seed, Nginx,
SSL e backup) pode ser executado de uma vez pelo instalador. Na VPS, como root:

```bash
mkdir -p /opt && cd /opt
git clone https://github.com/s2corporativo/verdelimpclaude.git verdelimp-erp
cd /opt/verdelimp-erp
chmod +x deploy/contabo/install.sh
./deploy/contabo/install.sh
```

O instalador pergunta apenas o domínio (com opção `sslip.io` se o DNS ainda não
estiver pronto), o e-mail do certificado e a chave GROQ (opcional); gera as
senhas/segredos sozinho, escolhe uma porta livre automaticamente e **pode ser
re-executado com segurança** — o que já estiver feito é pulado. Ao final,
imprime a URL e a senha inicial do admin.

As seções numeradas a seguir (**Opção B — manual**) fazem exatamente o mesmo,
passo a passo, e servem de referência para diagnóstico.

## 0. Pré-voo em VPS compartilhada (fazer ANTES de tudo)

```bash
# 1) Portas já em uso — anote-as; o ERP NÃO pode usar nenhuma delas
ss -tlnp | grep LISTEN

# 2) Containers/projetos Docker existentes (EJC, S2 etc.) — apenas para conhecer
docker ps
docker compose ls

# 3) Memória livre — o build do ERP usa ~2 GB por alguns minutos
free -h
# Se houver menos de 2 GB livres, crie swap antes do primeiro build:
#   fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
#   echo '/swapfile none swap sw 0 0' >> /etc/fstab

# 4) Sites Nginx existentes — para garantir que o novo site não conflita
ls /etc/nginx/sites-enabled/
```

Se a porta **3010** aparecer ocupada no passo 1, escolha outra livre e ajuste em DOIS lugares:
`APP_PORT` no `.env.production` e o `proxy_pass` no site Nginx do ERP.

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

Como a VPS já roda outros sites, **git, nginx e certbot provavelmente já estão instalados** — o comando abaixo é seguro (só instala o que faltar):

```bash
apt update
apt install -y git curl nginx certbot python3-certbot-nginx ca-certificates gnupg
```

> Evite `apt upgrade -y` em horário comercial numa VPS com sistemas em produção —
> faça em janela de manutenção.

## 3. Instalar Docker (pule se já existir)

```bash
docker --version && docker compose version   # se ambos responderem, pule esta seção
```

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

## 4. Firewall

A VPS já serve sites em produção — **primeiro verifique** o estado atual:

```bash
ufw status verbose
```

- Se o UFW **já estiver ativo** (provável, por causa do EJC/S2): não faça nada — as regras
  `OpenSSH` e `Nginx Full` já atendem o ERP, que só escuta em 127.0.0.1.
- Se estiver **inativo** e você quiser ativá-lo, garanta as regras ANTES de habilitar
  (senão derruba seu SSH e os sites existentes):

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
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
ln -sf .env.production .env   # o docker compose lê ${VARIÁVEIS} apenas do arquivo .env
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

A aplicação ficará localmente em (porta definida por `APP_PORT`, padrão **3010** para não
colidir com EJC/S2):

```text
http://127.0.0.1:3010
```

Conferir que subiu sem brigar com os outros sistemas:

```bash
curl -s http://127.0.0.1:3010/api/health   # esperado: {"ok":true,"db":"up"}
docker ps                                   # verdelimp-erp e verdelimp-db "healthy"; EJC/S2 intactos
```

## 8. Configurar Nginx (site adicional — não mexa nos existentes)

O ERP entra como **mais um** server block, ao lado dos sites do EJC, S2 e escritório.
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
nginx -t          # OBRIGATÓRIO: se falhar, NÃO recarregue — os sites existentes continuam intactos
systemctl reload nginx
```

Depois do reload, confirme que os outros sites continuam no ar (abra o site do
escritório, EJC e S2 no navegador ou via curl).

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
# adicionar a linha (todo dia às 02h20 — horário deslocado para não coincidir
# com backups do EJC/S2, se houver; mantém 14 dias):
20 2 * * * cd /opt/verdelimp-erp && docker compose exec -T db pg_dump -U verdelimp verdelimp_erp | gzip > /opt/backups/verdelimp_$(date +\%F).sql.gz && find /opt/backups -name 'verdelimp_*.sql.gz' -mtime +14 -delete
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
