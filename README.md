# Verdelimp ERP v2.3

Sistema ERP interno da **VERDELIMP SERVIÇOS E TERCEIRIZAÇÃO LTDA** para gestão operacional, comercial, fiscal, financeira, trabalhista e administrativa.

> Este repositório contém a estrutura de um sistema interno e deve permanecer **privado**. Dados reais, documentos, credenciais, certificados e arquivos operacionais nunca devem ser versionados.

## Módulos principais

- Dashboard executivo
- Ajuda com IA
- Pipeline de licitações
- Radar PNCP
- Propostas comerciais e PDF
- Dossiê Operacional: PDF/TXT → evidências → folha e reservas → dimensionamento → preço → proposta
- Perfis tributários versionados e cenários de preço
- Perfil documental escolhido por serviço, arquivos de empresa/funcionário/equipamento e reavaliação da mobilização
- Aprovação técnica, financeira e diretoria por versão da proposta
- Alterações de escopo e produtividade planejada × realizada
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
- Documentação SSO (dossiê mensal por funcionário — checklist de 19 requisitos)
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
- Central de Alertas
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

## Fluxo operacional v2.3

O fluxo completo e as regras de cálculo estão em [`DOSSIE_OPERACIONAL.md`](DOSSIE_OPERACIONAL.md). A IA não define o preço: ela extrai fatos e evidências; o motor determinístico calcula trabalhadores, HH, duração, custos, retenções, capital de giro e cenários.

A entrada em produção deve seguir obrigatoriamente [`HOMOLOGACAO_PRODUCAO.md`](HOMOLOGACAO_PRODUCAO.md).

## Operação segura

Arquivos principais:

- `deploy/contabo/deploy.sh` — backup prévio, build, migrations, healthcheck e rollback da imagem;
- `deploy/contabo/backup.sh` — banco, uploads, checksum e cópia off-site;
- `deploy/contabo/restore-test.sh` — ensaio de restauração em banco temporário;
- `deploy/contabo/monitor.sh` — saúde da aplicação, banco, disco e backups;
- `deploy/contabo/configure-operations.sh` — instalação dos crons e rotação de logs;
- `deploy/contabo/ops-config.example` — modelo sem credenciais para `.env.ops`.

A existência dos scripts no repositório não comprova que estejam instalados ou executando na VPS. A homologação exige logs, checksums, restore testado e identificação do commit implantado.

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
npx prisma migrate deploy   # produção (ou `npx prisma db push` só em dev)
npm run prisma:seed
npm run build
npm run start
```

## Comandos principais na VPS

```bash
cd /opt/verdelimp-erp
cp .env.vps.example .env.production
nano .env.production
cp deploy/contabo/ops-config.example .env.ops
nano .env.ops
chmod 600 .env.production .env.ops
docker compose build app
docker compose up -d db
docker compose run --rm migrate
docker compose up -d app
docker compose exec app npm run prisma:seed   # apenas na primeira instalação
```

Para atualização posterior:

```bash
cd /opt/verdelimp-erp
chmod +x deploy/contabo/*.sh
./deploy/contabo/deploy.sh
```

## Variáveis de ambiente

Use o arquivo `.env.vps.example` como referência. Nunca envie `.env.production` real para o GitHub.

Variáveis essenciais:

```env
POSTGRES_PASSWORD=
NEXTAUTH_SECRET=
NEXTAUTH_URL=https://erp.verdelimp.com.br
GROQ_API_KEY=
SEED_ADMIN_PASSWORD=
FISCAL_ENVIRONMENT=homologacao
```

As variáveis de backup e monitoramento ficam em `.env.ops`, criado exclusivamente na VPS a partir de `deploy/contabo/ops-config.example`.

## Nginx e SSL

O ERP roda internamente em:

```text
http://127.0.0.1:3010
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
- `.env.ops`
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
