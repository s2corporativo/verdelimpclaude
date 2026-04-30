# 🚀 Verdelimp ERP v2.2 — Guia de Publicação
## VERDELIMP SERVICOS E TERCEIRIZACAO LTDA · CNPJ 30.198.776/0001-29

---

## ⏱️ Tempo estimado: 20–30 minutos (sem experiência prévia)

---

## PASSO 1 — Extrair o projeto

```bash
# Extrair o ZIP em uma pasta
unzip verdelimp-erp-v2.2.zip
cd verdelimp-erp

# Instalar dependências
npm install
```

---

## PASSO 2 — Criar banco de dados PostgreSQL no Render

1. Acesse **render.com** → cadastre-se (gratuito)
2. Clique em **New +** → **PostgreSQL**
3. Preencha:
   - **Name:** `verdelimp-db`
   - **Region:** `Ohio (US East)` ou `Frankfurt (EU)`
   - **Plan:** Free (desenvolvimento) — ou **Starter R$25/mês** (produção)
4. Clique em **Create Database**
5. Aguarde ~2 minutos
6. Copie a **Internal Database URL** (começará com `postgresql://...`)

> ⚠️ A URL interna só funciona dentro da rede do Render. Para testes locais, use a **External Database URL**.

---

## PASSO 3 — Obter chave da API Anthropic (IA)

1. Acesse **console.anthropic.com**
2. **API Keys** → **Create Key**
3. Copie a chave (começa com `sk-ant-...`)
4. Guarde em local seguro — só é exibida uma vez

> O plano gratuito inclui créditos suficientes para uso inicial. Aproximadamente $0.003 por consulta ao assistente.

---

## PASSO 4 — Configurar variáveis de ambiente (local)

```bash
cp .env.example .env
```

Abra o `.env` e preencha:

```env
# ─── OBRIGATÓRIO ───────────────────────────────────
DATABASE_URL="postgresql://... (External URL do banco Render)"
NEXTAUTH_SECRET="cole-aqui-uma-string-aleatória-longa"
NEXTAUTH_URL="http://localhost:3000"
ANTHROPIC_API_KEY="sk-ant-sua-chave-aqui"

# ─── OPCIONAL (WhatsApp) ───────────────────────────
WHATSAPP_PROVIDER="disabled"   # ou "evolution" ou "zapi"
WHATSAPP_ADMIN_NUMBER="5531999990000"
```

**Gerar NEXTAUTH_SECRET:**
```bash
# Linux/Mac:
openssl rand -base64 32

# Windows PowerShell:
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

---

## PASSO 5 — Criar banco de dados e popular

```bash
# Aplicar schema ao banco (cria todas as tabelas)
npx prisma db push

# Popular com dados iniciais da Verdelimp
npm run prisma:seed
```

**Após o seed, o sistema terá:**
- 👤 Usuário admin: `admin@verdelimp.com.br` / `Verdelimp@2026`
- 👤 Usuário operacional: `giovanna@verdelimp.com.br` / `Verdelimp@2026`
- 🤝 5 clientes (PBH, CEMIG, Copasa, Sanesul, DNIT)
- 📦 4 fornecedores
- 👷 8 funcionários com salários reais
- 🔌 9 integrações cadastradas
- 🚗 3 veículos (Hilux, Iveco, Gol)
- 💼 Configuração fiscal completa

---

## PASSO 6 — Testar localmente

```bash
npm run dev
```

Acesse: **http://localhost:3000**

Login: `admin@verdelimp.com.br` / `Verdelimp@2026`

> ⚠️ O sistema força troca de senha no primeiro acesso.

**Verificar os módulos principais:**
- [ ] Dashboard carrega KPIs
- [ ] Clientes → botão CNPJ busca na Receita Federal
- [ ] Central Fiscal → Apuração Automática gera lançamentos
- [ ] Ajuda com IA → chat responde perguntas do sistema
- [ ] Proposta por Edital → cola escopo, IA gera proposta

---

## PASSO 7 — Publicar no GitHub

```bash
# Verificar se .env está no .gitignore (CRÍTICO)
cat .gitignore | grep ".env"
# Deve aparecer: .env

# Inicializar repositório
git init
git add .
git commit -m "Verdelimp ERP v2.2 — deploy inicial"

# Criar repositório PRIVADO no GitHub
# 1. Acesse github.com → New repository
# 2. Nome: verdelimp-erp
# 3. PRIVADO (Private) — NUNCA público
# 4. NÃO adicionar README, .gitignore ou license
# 5. Copiar a URL do repositório

git remote add origin https://github.com/SEU-USUARIO/verdelimp-erp.git
git branch -M main
git push -u origin main
```

---

## PASSO 8 — Deploy no Render (Web Service)

1. **render.com** → **New +** → **Web Service**
2. Conectar GitHub → autorizar → selecionar `verdelimp-erp`
3. Configurar:

| Campo | Valor |
|-------|-------|
| **Name** | `verdelimp-erp` |
| **Branch** | `main` |
| **Build Command** | `npm install && npx prisma generate && npm run build` |
| **Start Command** | `npm start` |
| **Node Version** | `20` |
| **Plan** | Free (testes) ou Starter (produção) |

4. Em **Environment Variables**, adicionar **todas** as variáveis:

```
DATABASE_URL          = postgresql://... (Internal URL — sem sslmode)
NEXTAUTH_SECRET       = (gerado no Passo 4)
NEXTAUTH_URL          = https://verdelimp-erp.onrender.com
ANTHROPIC_API_KEY     = sk-ant-...
AI_ENABLED            = true
AI_PROVIDER           = anthropic
NEXT_PUBLIC_APP_NAME  = Verdelimp ERP
PNCP_ENABLED          = true
FISCAL_ENVIRONMENT    = producao
SEFAZ_CERTIFICATE_ENABLED = false
ESOCIAL_ENABLED       = false
WHATSAPP_PROVIDER     = disabled
```

> ⚠️ Use a **Internal Database URL** do banco (sem `?sslmode=require`) para serviços no mesmo projeto Render.

5. Clique em **Create Web Service**
6. Aguardar build: **~5 minutos**

---

## PASSO 9 — Rodar seed em produção

Após o deploy, executar o seed **uma única vez**:

**Opção A — Via Render Shell:**
```bash
# Render → Service → Shell
npm run prisma:seed
```

**Opção B — Adicionar ao Build Command:**
```
npm install && npx prisma generate && npx prisma db push && npm run build
```
> Atenção: `db push` zera o banco em cada deploy. Use apenas na primeira vez.

---

## PASSO 10 — Primeiro acesso em produção

1. Acesse `https://verdelimp-erp.onrender.com`
2. Login: `admin@verdelimp.com.br` / `Verdelimp@2026`
3. **Trocar senha imediatamente** (sistema obriga)
4. Ir em **Configurações** → atualizar dados da empresa
5. Testar todos os módulos

---

## 🌐 URL após deploy

```
https://verdelimp-erp.onrender.com
```

Para domínio próprio (ex: erp.verdelimp.com.br):
- Render → Settings → Custom Domains
- Apontar o DNS do seu domínio para o Render

---

## 📋 Checklist de produção

```
[ ] DATABASE_URL com Internal URL do banco Render
[ ] NEXTAUTH_SECRET gerado (não usar valor de exemplo)
[ ] NEXTAUTH_URL = URL real do deploy (não localhost)
[ ] ANTHROPIC_API_KEY válida
[ ] Seed executado (npm run prisma:seed)
[ ] Senha do admin alterada
[ ] .env NÃO commitado no GitHub
[ ] Repositório GitHub PRIVADO
[ ] SEFAZ_CERTIFICATE_ENABLED = false
[ ] FISCAL_ENVIRONMENT = producao
```

---

## 🔒 Segurança — checklist obrigatório

| Item | Status |
|------|--------|
| `.env` no `.gitignore` | ✅ Já configurado |
| Senhas com bcrypt 12 rounds | ✅ Implementado |
| Bloqueio após 5 tentativas | ✅ Implementado |
| Sessão JWT 8 horas | ✅ Implementado |
| APIs públicas sem autenticação | ✅ Middleware configurado |
| ANTHROPIC_API_KEY só server-side | ✅ Nunca NEXT_PUBLIC_ |
| SEFAZ desabilitado por padrão | ✅ false no .env |
| Repositório privado | ⚠️ **Você deve garantir** |
| Senha admin alterada | ⚠️ **Fazer no primeiro acesso** |

---

## 🔧 Comandos úteis

```bash
npm run dev              # Desenvolvimento local (porta 3000)
npm run build            # Build de produção
npm run start            # Servidor de produção
npm run prisma:seed      # Popular banco
npx prisma db push       # Aplicar schema (sem migration)
npx prisma studio        # Interface visual do banco
npx prisma generate      # Gerar cliente Prisma
```

---

## 📊 Módulos disponíveis (28 telas)

| Grupo | Módulos |
|-------|---------|
| **Operacional** | Clientes, Fornecedores, Propostas+PDF, Contratos, Medição Mensal, Precificação IA, Proposta por Edital IA, Tabela de Preços |
| **Campo** | Diário de Obras, Histórico de Serviços, Combustível, Almoxarifado, EPI com CA, Importar NF-e XML |
| **Financeiro** | Central Fiscal (DAS/FGTS/ISS auto), Financeiro, DRE Mensal, Relatório Contador PDF |
| **RH** | Folha INSS/IRRF, NRs e Treinamentos, WhatsApp Alertas |
| **Licitações** | Radar PNCP + IA, Regularidade Fiscal/CND |
| **Sistema** | Ajuda com IA, Integrações, Configurações |

---

## 🔌 APIs integradas (gratuitas, sem configuração)

| API | Uso |
|-----|-----|
| ViaCEP | Endereço automático por CEP |
| BrasilAPI CNPJ | Dados Receita Federal |
| IBGE Municípios | Dados geográficos |
| Feriados 2026 | Calendário fiscal |
| ISS Betim LC33/2003 | Alíquota automática NFS-e |
| PNCP | Radar de licitações |
| Anthropic Claude | IA assistente + análise |

---

## ⚠️ Limitações do plano gratuito Render

| Recurso | Plano Free | Plano Starter |
|---------|-----------|---------------|
| Web Service | Dorme após 15min inativo | Sempre ativo |
| PostgreSQL | 90 dias, 1GB | Ilimitado, 1GB+ |
| Banda | 100GB/mês | Ilimitado |
| **Custo** | **R$0** | **~R$50/mês** |

> Para uso diário em produção, recomendamos o **Starter** para evitar o "cold start" de 30 segundos.

---

## 📞 Suporte

**VERDELIMP SERVICOS E TERCEIRIZACAO LTDA**
- CNPJ: 30.198.776/0001-29 · Betim/MG
- Email: ADM@VERDELIMP.COM.BR
- Tel: (31) 3591-4546
- Sistema: Verdelimp ERP v2.2 · Next.js 14 · PostgreSQL · Prisma · Claude AI
