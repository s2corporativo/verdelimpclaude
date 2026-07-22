# Deploy do Verdelimp ERP v2.3 em VPS Contabo

Este guia publica o Verdelimp ERP em uma VPS Ubuntu compartilhada com outros sistemas, usando Docker Compose, PostgreSQL interno, Nginx e SSL.

A entrada em produção somente deve ocorrer após o cumprimento de [`HOMOLOGACAO_PRODUCAO.md`](HOMOLOGACAO_PRODUCAO.md).

## 1. Princípios obrigatórios

- o repositório deve ser privado;
- o PostgreSQL não pode expor porta pública;
- o ERP deve escutar apenas em `127.0.0.1`;
- `.env.production` e `.env.ops` existem somente na VPS;
- toda atualização exige backup prévio de banco e uploads;
- migrations e seed usam serviços utilitários, nunca a imagem standalone da aplicação;
- o seed é executado apenas na primeira instalação;
- backup off-site e restore testado são bloqueadores de produção.

## 2. Arquitetura

```text
GitHub privado
  ↓
VPS Contabo Ubuntu
  ↓
Docker Compose
  ├─ verdelimp-db      PostgreSQL 16
  ├─ verdelimp-erp     Next.js standalone
  ├─ migrate           serviço temporário
  └─ seed              serviço temporário
  ↓
Nginx + SSL
  ↓
https://erp.verdelimp.com.br
```

O projeto Compose usa o nome `verdelimp`, evitando colisão com EJC, S2 e outros serviços da VPS.

## 3. Pré-voo da VPS compartilhada

```bash
ss -tlnp | grep LISTEN
docker ps
docker compose ls
free -h
df -h
ls /etc/nginx/sites-enabled/
```

Requisitos recomendados:

- Ubuntu 22.04 ou 24.04 LTS;
- 2 vCPU ou mais;
- 4 GB de RAM ou mais;
- espaço de disco compatível com banco, documentos e backups;
- Docker e Docker Compose;
- Nginx e Certbot;
- domínio apontado para a VPS.

A porta padrão do ERP no host é `3010`. Se estiver ocupada, escolha outra e ajuste `APP_PORT`.

## 4. Clonar o repositório

```bash
mkdir -p /opt
cd /opt
git clone git@github.com:s2corporativo/verdelimpclaude.git verdelimp-erp
cd /opt/verdelimp-erp
```

Para repositório privado, use deploy key SSH ou autenticação equivalente. Não grave token pessoal no código ou nos scripts.

## 5. Preparar variáveis da aplicação

```bash
cp .env.vps.example .env.production
chmod 600 .env.production
nano .env.production
ln -sf .env.production .env
```

Preencher, no mínimo:

```env
POSTGRES_DB=verdelimp_erp
POSTGRES_USER=verdelimp
POSTGRES_PASSWORD=
NEXTAUTH_URL=https://erp.verdelimp.com.br
NEXTAUTH_SECRET=
APP_PORT=3010
SEED_ADMIN_PASSWORD=
FISCAL_ENVIRONMENT=homologacao
GROQ_API_KEY=
```

Gerar segredos diretamente na VPS, sem enviá-los ao chat ou ao GitHub:

```bash
openssl rand -base64 32
```

O `SEED_ADMIN_PASSWORD` só é necessário para a primeira instalação. Depois do primeiro acesso, a senha deve ser alterada.

## 6. Preparar backup e monitoramento

```bash
cp deploy/contabo/ops-config.example .env.ops
chmod 600 .env.ops
nano .env.ops
```

Parâmetros obrigatórios:

```text
BACKUP_DIR=/opt/backups/verdelimp
RETENCAO_DIAS=14
RCLONE_REMOTE=<remote real>
REQUIRE_OFFSITE=true
BACKUP_MAX_AGE_HOURS=30
DISK_ALERT_PERCENT=85
```

Configure previamente o `rclone` e confirme o acesso ao destino externo. O valor de exemplo `gdrive:backups/verdelimp` não deve ser aceito sem que esse remote exista e esteja autenticado.

## 7. Primeira instalação

O instalador não gera nem imprime segredos. Ele exige os dois arquivos de ambiente já preparados.

```bash
chmod +x deploy/contabo/*.sh
deploy/contabo/install-v23.sh
```

O fluxo executa:

1. validação dos pré-requisitos;
2. build da aplicação e dos serviços utilitários;
3. subida e healthcheck do PostgreSQL;
4. aplicação das migrations;
5. seed inicial, uma única vez;
6. subida e healthcheck da aplicação;
7. configuração do site Nginx;
8. instalação das rotinas de backup e monitoramento;
9. backup inicial;
10. ensaio de restauração;
11. monitoramento final.

O arquivo `deploy/contabo/install.sh` é apenas um encaminhador para o instalador v2.3.

## 8. Instalação manual

```bash
cd /opt/verdelimp-erp
ln -sf .env.production .env

docker compose build --pull app migrate seed
docker compose up -d db
docker compose run --rm migrate
docker compose run --rm seed       # apenas na primeira instalação
docker compose up -d app
```

Nunca use:

```text
docker compose exec app npx prisma migrate deploy
docker compose exec app npm run prisma:seed
```

A imagem `app` é standalone e não contém Prisma CLI, código-fonte ou scripts de seed.

## 9. Configurar Nginx

```bash
cp deploy/contabo/nginx-verdelimp.conf /etc/nginx/sites-available/verdelimp-erp
nano /etc/nginx/sites-available/verdelimp-erp
ln -sf /etc/nginx/sites-available/verdelimp-erp /etc/nginx/sites-enabled/verdelimp-erp
nginx -t
systemctl reload nginx
```

A configuração deve apontar para:

```text
http://127.0.0.1:3010
```

ou para a porta definida em `APP_PORT`.

Confirme que os sites do EJC, S2 e escritório permanecem acessíveis antes e depois do reload.

## 10. SSL

```bash
certbot --nginx -d erp.verdelimp.com.br
certbot renew --dry-run
```

## 11. Atualizações posteriores

```bash
cd /opt/verdelimp-erp
chmod +x deploy/contabo/deploy.sh
deploy/contabo/deploy.sh
```

O deploy seguro:

- recusa árvore Git com alterações locais;
- executa backup integral;
- preserva a imagem anterior;
- usa `git pull --ff-only`;
- reconstrói a aplicação;
- aplica migrations pelo serviço `migrate`;
- aguarda o healthcheck;
- valida `/api/health`;
- restaura a imagem anterior quando a aplicação não fica saudável.

As migrations não são revertidas automaticamente. Se houver incompatibilidade de schema, use o backup pré-deploy e restauração controlada.

## 12. Rotinas operacionais

Instalar cron e rotação de logs:

```bash
deploy/contabo/configure-operations.sh
```

Rotinas padrão:

- backup diário às 02h20;
- monitoramento a cada 10 minutos;
- ensaio de restauração trimestral;
- rotação semanal dos logs.

Execução manual:

```bash
deploy/contabo/backup.sh
deploy/contabo/restore-test.sh
deploy/contabo/monitor.sh
```

Logs:

```bash
ls -lh /var/log/verdelimp/
tail -f /var/log/verdelimp/backup.log
tail -f /var/log/verdelimp/monitor.log
tail -f /var/log/verdelimp/restore-test.log
```

## 13. Verificações pós-deploy

```bash
cd /opt/verdelimp-erp
git rev-parse HEAD
docker compose ps
docker compose logs --tail=100 app
curl -fsS http://127.0.0.1:${APP_PORT:-3010}/api/health
deploy/contabo/monitor.sh
```

Conferir migrations:

```bash
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c 'SELECT migration_name, finished_at FROM "_prisma_migrations" ORDER BY finished_at DESC LIMIT 10;'
```

A migration do Dossiê Operacional v2.3 é:

```text
20260721210000_dossie_operacional
```

## 14. Backup e restore

O script `backup.sh` gera:

- dump PostgreSQL comprimido;
- arquivo comprimido do volume de uploads;
- manifesto SHA-256;
- cópia off-site via rclone;
- retenção local e remota.

O `restore-test.sh`:

- valida os arquivos comprimidos;
- cria banco temporário;
- restaura o dump;
- confere tabelas e migrations;
- extrai os uploads em diretório temporário;
- remove o banco e os arquivos temporários ao final.

Não confunda exportação JSON/CSV do sistema com backup restaurável.

## 15. Segurança

Nunca versionar:

- `.env.production`;
- `.env.ops`;
- certificados digitais;
- chaves privadas;
- credenciais de API;
- XMLs reais;
- documentos de funcionários;
- contratos reais;
- comprovantes bancários;
- dumps de banco;
- arquivos de backup.

Revise periodicamente:

```bash
npm audit --omit=dev --audit-level=high
docker image ls
docker system df
ufw status verbose
certbot certificates
```

## 16. Observação fiscal

Os módulos fiscais, tributários e trabalhistas são ferramentas de apoio gerencial. Transmissões oficiais para SEFAZ, Receita Federal, eSocial, EFD-Reinf ou NFS-e Nacional não devem ser ativadas sem certificado digital, homologação, contador responsável, validação técnica e autorização expressa.
