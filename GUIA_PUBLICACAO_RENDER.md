# 🚀 Verdelimp ERP — Guia de Publicação no Render

## Pré-requisitos
- Conta no GitHub (github.com)
- Conta no Render (render.com) — plano gratuito funciona
- Git instalado no computador

---

## PASSO 1 — Preparar o projeto localmente

```bash
# Copiar o arquivo do zip para uma pasta
cd verdelimp-erp

# Instalar dependências
npm install

# Criar o arquivo .env local (NUNCA commitar este arquivo)
cp .env.example .env
# Editar o .env e preencher os valores
```

---

## PASSO 2 — Criar banco de dados no Render

1. Acesse render.com → New → PostgreSQL
2. Nome: `verdelimp-db`
3. Plano: Free (desenvolvimento) ou Starter (produção)
4. Clique em **Create Database**
5. Copie a **Internal Database URL** (começa com `postgresql://...`)

---

## PASSO 3 — Configurar variáveis de ambiente

No arquivo `.env`, preencha:

```env
DATABASE_URL="postgresql://... (copiar do Render)"
NEXTAUTH_SECRET="rodar: openssl rand -base64 32"
NEXTAUTH_URL="https://seu-app.onrender.com"
NEXT_PUBLIC_APP_NAME="Verdelimp ERP"
AI_ENABLED="true"
AI_PROVIDER="anthropic"
ANTHROPIC_API_KEY="sua-chave-anthropic"
```

---

## PASSO 4 — Criar banco de dados e seed

```bash
# Aplicar schema ao banco
npx prisma db push

# Verificar se funcionou
npx prisma studio

# Popular com dados iniciais
npm run prisma:seed
```

✅ Após o seed, você terá:
- Usuário: `admin@verdelimp.com.br` / `Verdelimp@2026`
- 5 clientes, 4 fornecedores, 8 funcionários
- Configuração fiscal completa
- 9 integrações cadastradas

---

## PASSO 5 — Testar localmente

```bash
npm run dev
# Acesse http://localhost:3000
# Login: admin@verdelimp.com.br / Verdelimp@2026
```

---

## PASSO 6 — Publicar no GitHub

```bash
# Inicializar repositório (se ainda não fez)
git init
git add .
git commit -m "Verdelimp ERP v2.2 — inicial"

# Criar repositório PRIVADO no GitHub
# github.com → New repository → Private

# Conectar e enviar
git remote add origin https://github.com/seu-usuario/verdelimp-erp.git
git branch -M main
git push -u origin main
```

> ⚠️ **IMPORTANTE:** Certifique-se que o `.env` está no `.gitignore` antes de fazer push.

---

## PASSO 7 — Deploy no Render

1. render.com → New → **Web Service**
2. Conectar ao repositório GitHub `verdelimp-erp`
3. Configurar:
   - **Name:** verdelimp-erp
   - **Branch:** main
   - **Build Command:** `npm install && npx prisma generate && npm run build`
   - **Start Command:** `npm start`
   - **Node Version:** 20

4. Em **Environment Variables**, adicionar:
   ```
   DATABASE_URL         = (Internal URL do banco criado no Passo 2)
   NEXTAUTH_SECRET      = (gerar com: openssl rand -base64 32)
   NEXTAUTH_URL         = https://verdelimp-erp.onrender.com
   ANTHROPIC_API_KEY    = (sua chave Anthropic)
   AI_ENABLED           = true
   AI_PROVIDER          = anthropic
   PNCP_ENABLED         = true
   FISCAL_ENVIRONMENT   = homologacao
   SEFAZ_CERTIFICATE_ENABLED = false
   ESOCIAL_ENABLED      = false
   ```

5. Clique em **Create Web Service**

6. Aguardar build (~3 minutos)

---

## PASSO 8 — Pós-deploy

```bash
# Rodar seed no Render (uma vez)
# Render → Shell → executar:
npm run prisma:seed
```

Ou configurar no Build Command:
```
npm install && npx prisma generate && npx prisma db push && npm run build
```

---

## PASSO 9 — Primeiro acesso

1. Acesse `https://verdelimp-erp.onrender.com`
2. Login: `admin@verdelimp.com.br` / `Verdelimp@2026`
3. **Alterar senha imediatamente** (o sistema força na primeira entrada)
4. Configurar empresa em `/dashboard/configuracoes`

---

## Estrutura do projeto

```
verdelimp-erp/
├── prisma/
│   ├── schema.prisma          ← 28 modelos de banco
│   └── seed.ts               ← Dados iniciais
├── src/
│   ├── app/
│   │   ├── (dashboard)/       ← Páginas protegidas
│   │   ├── api/               ← API routes server-side
│   │   ├── login/             ← Tela de login
│   │   ├── layout.tsx
│   │   └── providers.tsx
│   └── lib/
│       ├── prisma.ts          ← Cliente Prisma
│       ├── auth.ts            ← NextAuth config
│       ├── fiscal-calc.ts     ← Apuração tributária automática
│       ├── iss-betim.ts       ← Tabela ISS LC 33/2003
│       └── api-cache.ts       ← Cache para APIs públicas
├── middleware.ts              ← Proteção de rotas
├── .env.example               ← Variáveis necessárias
├── package.json
└── next.config.js
```

---

## APIs conectadas (gratuitas)

| API | Uso no Sistema |
|-----|---------------|
| ViaCEP | Preenchimento automático de endereço |
| BrasilAPI CNPJ | Dados cadastrais de clientes/fornecedores |
| IBGE Municípios | Dados municipais para NFS-e |
| BrasilAPI Feriados | Calendário fiscal |
| PNCP | Radar de licitações |
| ISS Betim LC 33/2003 | Alíquota automática em NFS-e |

---

## Comandos de referência

```bash
npm run dev              # Desenvolvimento local
npm run build            # Build produção
npm run start            # Iniciar servidor
npm run prisma:seed      # Popular banco
npx prisma studio        # Visualizar banco
npx prisma db push       # Aplicar schema
npx prisma migrate dev   # Criar migration
```

---

## Suporte

- CNPJ: 30.198.776/0001-29
- Email: ADM@VERDELIMP.COM.BR
- Sistema: Verdelimp ERP v2.2
