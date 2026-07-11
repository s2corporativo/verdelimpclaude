# Verdelimp ERP v2.2

Sistema ERP interno da **VERDELIMP SERVIÇOS E TERCEIRIZAÇÃO LTDA** para gestão operacional, comercial, fiscal, financeira, trabalhista e administrativa.

## Módulos principais

- Dashboard executivo
- Ajuda com IA
- Pipeline de licitações
- Radar PNCP
- Propostas comerciais e PDF
- Proposta por edital com IA
- Precificação
- Contratos
- GED / documentos
- Medição mensal
- Clientes
- Fornecedores
- Logística operacional
- Diário de obras
- Retroescavadeira
- Dedetização
- Equipamentos
- Combustível
- Almoxarifado
- Controle de EPI
- Financeiro
- Central Fiscal
- DRE
- Importação NF-e
- Regularidade fiscal
- Relatório para contador
- RH e folha
- Mobilizações
- Treinamentos e NRs
- Integrações
- WhatsApp alertas
- Administração (usuários, papéis, permissões e auditoria)
- Configurações

## Stack técnica

- Next.js 14
- React 18
- TypeScript
- Prisma 6
- PostgreSQL
- NextAuth
- Docker
- Nginx
- VPS Contabo

## Deploy recomendado

A arquitetura recomendada é:

```text
GitHub privado
  ↓
VPS Contabo Ubuntu
  ↓
Docker Compose
  ↓
Next.js + PostgreSQL
  ↓
Nginx + SSL
  ↓
erp.verdelimp.com.br
```

## Arquivos de deploy para VPS

- `Dockerfile`
- `docker-compose.yml`
- `.env.vps.example`
- `DEPLOY_CONTABO.md`
- `deploy/contabo/nginx-verdelimp.conf`
- `deploy/contabo/deploy.sh`

## Comandos principais locais

```bash
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed
npm run build
npm run start
```

## Comandos principais na VPS

```bash
cd /opt/verdelimp-erp
cp .env.vps.example .env.production
nano .env.production
docker compose up -d --build
docker compose exec app npx prisma db push
docker compose exec app npm run prisma:seed
```

Para atualização posterior:

```bash
cd /opt/verdelimp-erp
chmod +x deploy/contabo/deploy.sh
./deploy/contabo/deploy.sh
```

## Variáveis de ambiente

Use o arquivo `.env.vps.example` como referência. Nunca envie `.env.production` real para o GitHub.

Variáveis essenciais:

```env
POSTGRES_PASSWORD=
NEXTAUTH_SECRET=
NEXTAUTH_URL=https://erp.verdelimp.com.br
ANTHROPIC_API_KEY=
FISCAL_ENVIRONMENT=homologacao
```

## Nginx e SSL

O ERP roda internamente em:

```text
http://127.0.0.1:3000
```

O Nginx deve publicar o domínio externo com SSL:

```text
https://erp.verdelimp.com.br
```

Guia completo: `DEPLOY_CONTABO.md`.

## Segurança

Não enviar ao GitHub:

- `.env` real
- `.env.production`
- certificado digital A1
- senha de certificado
- DATABASE_URL real
- chaves de API reais
- XMLs fiscais reais
- documentos pessoais reais
- comprovantes reais
- contratos reais sensíveis

## Observação fiscal

Os módulos fiscais, tributários e trabalhistas operam como **apoio gerencial** e devem ser validados pelo contador responsável. O sistema não deve transmitir informações oficiais para SEFAZ, Receita Federal, eSocial, EFD-Reinf ou NFS-e Nacional sem certificado digital, homologação, validação técnica e autorização expressa.
