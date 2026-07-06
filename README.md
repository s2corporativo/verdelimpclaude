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
- Configurações

## Stack técnica

- Next.js 14
- React 18
- TypeScript
- Prisma 6
- PostgreSQL
- NextAuth
- Render

## Deploy recomendado

A arquitetura recomendada é:

```text
GitHub privado
  ↓
Render Web Service
  ↓
Render PostgreSQL
```

## Comandos principais

```bash
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed
npm run build
npm run start
```

## Variáveis de ambiente

Use o arquivo `.env.example` como referência. Nunca envie `.env` real para o GitHub.

Variáveis essenciais:

```env
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
ANTHROPIC_API_KEY=
FISCAL_ENVIRONMENT=homologacao
```

## Render

Build Command:

```bash
npm install && npx prisma generate && npm run build
```

Start Command:

```bash
npm run start
```

Após configurar o banco PostgreSQL no Render, execute no Shell:

```bash
npx prisma db push
npm run prisma:seed
```

## Segurança

Não enviar ao GitHub:

- `.env` real
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
