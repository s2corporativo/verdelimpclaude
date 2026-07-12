---
name: consertar-sistema
description: >
  Runbook de reparo do Verdelimp ERP. Use quando o usuário relatar que o sistema
  está com erro, fora do ar, com bug, com dados errados/congelados, build
  falhando, ou pedir para "consertar", "diagnosticar" ou "arrumar" o sistema.
  Cobre banco, deploy na VPS Contabo, build, migrações e as armadilhas
  conhecidas do projeto.
---

# Skill: Consertar o Verdelimp ERP

Você é o técnico de manutenção deste ERP. Antes de mexer em qualquer coisa,
**diagnostique**. Este runbook concentra o que já se sabe sobre o sistema.

## Stack e onde as coisas moram
- **Next.js 14 (App Router)** · **PostgreSQL 16 + Prisma** · **NextAuth (JWT)** · **GROQ IA** · **Docker Compose na VPS Contabo**.
- Páginas em `src/app/dashboard/**`, APIs em `src/app/api/**/route.ts`, libs em `src/lib`, schema em `prisma/schema.prisma`, middleware em `src/middleware.ts`.
- Menu e hubs: `src/app/dashboard/layout.tsx` + `src/lib/nav-grupos.ts` (+ `src/components/SubNav.tsx`).
- Deploy: `deploy/contabo/install.sh` (1ª vez) e `deploy/contabo/deploy.sh` (atualizações). Guia em `DEPLOY_CONTABO.md`. Mapa em `SYSTEM_MAP.md`.
- VPS compartilhada com EJC, S2 e o site do escritório — projeto Docker nomeado `verdelimp`, porta interna `APP_PORT` (padrão 3010/3011), Postgres interno sem porta exposta.

## Passo 0 — Diagnóstico primeiro
1. Peça (ou rode) a **Central de Diagnóstico**: `GET /api/diagnostico` (também em `/dashboard/diagnostico`). Ela já testa banco, migrações, config, segurança, integrações e consistência.
2. Se o sistema estiver fora do ar, na VPS: `cd /opt/verdelimp-erp && docker compose ps` e `docker compose logs --tail 60 app`.

## Armadilhas conhecidas (verifique nesta ordem)

### 502 Bad Gateway
Nginx apontando para porta diferente da do app. Confira:
`grep proxy_pass /etc/nginx/sites-enabled/verdelimp-erp` vs `grep APP_PORT /opt/verdelimp-erp/.env.production`.
Corrija a porta no site do Nginx, `nginx -t && systemctl reload nginx`.

### "Authentication failed against database" na subida
Volume de banco antigo com senha diferente da do `.env.production` atual.
Como não há dados a perder numa instalação nova: `docker compose down -v && ./deploy/contabo/install.sh`.
`down -v` remove só os volumes do projeto `verdelimp` (não toca EJC/S2).

### Build da Vercel/CI falhando com erro de tipo Prisma
Cache de `node_modules` com Prisma Client desatualizado. Já resolvido: `package.json` tem `postinstall: prisma generate` e `build: prisma generate && next build`. Se voltar, confirme que esses scripts existem.

### Dados "congelados" (uma lista não atualiza em produção)
Rota GET sem `export const dynamic = "force-dynamic"` é pré-renderizada no build. Toda rota que lê o banco precisa dessa linha. Verifique:
`for f in $(find src/app/api -name route.ts); do grep -q "export async function GET()" "$f" && ! grep -q force-dynamic "$f" && echo "$f"; done`

### Erro de campo Prisma inexistente
Sempre confira o nome real em `prisma/schema.prisma` antes de usar. Ex.: `Document` usa `nome` (não `titulo`); `InventoryItem` usa `description` (não `name`); `WorkDiary` NÃO tem relação com `Contract` (filtre por `contractId`).

### Caracteres inválidos / arquivo corrompido (erros TS1127)
Bytes nulos no arquivo. Limpe: `tr -d '\000' < arquivo > tmp && mv tmp arquivo`.

### Página em branco / componente sem renderizar
Props com nomes trocados entre a definição e a chamada do componente. Confira a assinatura.

### Perda de foco em input a cada tecla
Componente definido DENTRO do corpo do pai. Use uma função `campo()` que retorna JSX (não um componente aninhado).

## Regras de ouro
- **Nunca** apague dados de produção sem backup (`docker compose exec -T db pg_dump -U verdelimp verdelimp_erp | gzip > backup.sql.gz`).
- Alterações de banco **sempre** via migration (`prisma migrate`), nunca SQL manual em produção.
- **Nunca** commitar `.env.production`, certificados, XMLs reais, documentos, contratos ou chaves.
- Antes de recarregar o Nginx numa VPS compartilhada: `nginx -t` — se falhar, NÃO recarregue (protege EJC/S2).
- Toda correção não-trivial: rode `npx tsc --noEmit` (deve dar 0 erros — `ignoreBuildErrors` está desligado) e `npm run build` antes de commitar.

## Fluxo de correção padrão
1. Diagnostique (Central de Diagnóstico + logs).
2. Reproduza / localize o arquivo pelo sintoma acima.
3. Corrija de forma mínima; rode `npx tsc --noEmit` e `npm run build`.
4. Commit descritivo + PR draft; após verde, o usuário mergeia.
5. Na VPS: `cd /opt/verdelimp-erp && ./deploy/contabo/deploy.sh` (aplica migrações e reinicia).
