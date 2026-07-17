# 🔍 Revisão Rigorosa do Sistema — Verdelimp ERP (julho/2026)

> Parecer de operador de sistemas: auditoria completa de segurança, dados, cálculos, frontend e infraestrutura.
> Escopo: 91 rotas de API · 56 páginas · 60+ tabelas Prisma · Docker/VPS Contabo.
> Verificação executada: `vitest run` → **47/47 testes passam** · `tsc --noEmit` → **limpo** · `npm audit` → **6 vulnerabilidades (1 crítica, 2 altas)**.

---

## 🔴 CRÍTICO — corrigir imediatamente

### C1. GED `/api/documentos` sem controle de acesso (segurança)
`src/app/api/documentos/route.ts:21` (GET) e `:93` (POST) não fazem **nenhuma** checagem de papel, e a rota **não está** na lista de guards do `src/middleware.ts`. Qualquer usuário autenticado — inclusive `ALMOXARIFADO` ou `OPERACIONAL` — pode:
- listar todos os documentos, incluindo `confidencial: true` (holerites, ASO, CTPS, contrato social, procurações);
- baixar o binário via `POST { action: "download" }` (retorna `base64Data`);
- criar, arquivar, versionar e mudar status de qualquer documento, forjando o campo `uploadBy` (vem do body, não da sessão).

**Correção:** adicionar `/api/documentos` aos guards + validar papel e flag `confidencial` dentro do handler; derivar `uploadBy` da sessão.

### C2. Tabelas de folha defasadas e rotuladas como "2026" (fiscal/trabalhista)
`src/lib/folha.ts`:
- **INSS** (`:13-18`): faixas `1.412,00 / 2.666,68 / 4.000,03 / 7.786,02` — valores de **2024** (teto ≈ R$ 908,86). Em 2026, faixas e teto são outros → **sub-retenção do empregado em todas as faixas**.
- **IRRF** (`:34-45`): isenção 2.259,20, parcelas 169,44…896,00, dependente 189,59, simplificado 564,80 — tabela de **mai/2024**, sem a regra de isenção ampliada vigente em 2026.
- **Salário mínimo** (`:60`): `1.518,00` (**2025**) — descasado da 1ª faixa do INSS (1.412, de 2024) usado no mesmo holerite.
- Os testes (`folha.test.ts:18,32`) **congelam os valores de 2024**, então a suíte passa validando a tabela errada.

**Correção:** versionar tabelas por ano (`FAIXAS_INSS_POR_ANO[ano]`), alinhar mínimo + 1ª faixa, e criar teste que falhe quando o ano corrente não tiver tabela cadastrada. A mecânica progressiva do INSS e a regra do "menor imposto" no IRRF estão **corretas** — o problema são apenas os números.

### C3. DRE conta a receita duas vezes (financeiro)
Ao faturar uma medição, `src/app/api/medicao/route.ts:100-122` cria um `Expense` de categoria "Receita Contratual" (`type: "receita"`) além da `FiscalNfse`. A DRE (`src/app/api/dre/route.ts:16`) agrega **todas** as `expense` da competência sem filtrar o tipo da categoria — a receita entra em `despesasOp` e é subtraída em `lucroLiquido = rec − trib − desp` (`:21`), **subestimando o lucro exatamente no valor faturado**.

**Correção:** filtrar `category.type = "despesa"` na agregação (ou modelar receita fora da tabela de despesas).

### C4. Vulnerabilidade crítica em dependência usada no fiscal
`npm audit`: `fast-xml-parser <=5.6.0` — **crítica** (ReDoS, bypass de entidades/DOCTYPE) — é justamente o parser da importação de NF-e (`src/lib/nfe-parser.ts`). Também: `next@14.2.29` (**alta**: SSRF via middleware, cache poisoning, DoS), `nodemailer` (**alta**: SMTP command injection). **Correção:** atualizar `fast-xml-parser` e `nodemailer` (compatível), planejar upgrade do Next; rodar `npm audit` em CI.

### C5. Backup não protege contra perda da VPS (operação)
- O cron `pg_dump` (02h20, retenção 14 dias) grava em `/opt/backups` **na mesma VPS** — o próprio `DEPLOY_CONTABO.md:298` admite o risco; a cópia off-site é só recomendada, não implementada.
- O volume `/app/uploads` (GED, XMLs, fotos de OS, ASOs) **não entra em nenhum backup**.
- A rota `/api/backup` **não é backup**: é export JSON/CSV **truncado** por `take:` (500 clientes, 200 contratos, 2.000 despesas) — perde registros silenciosamente.
- Restore nunca evidenciado/testado.

**Correção:** cron com `pg_dump` + `tar` de uploads → rclone/S3 off-site; testar restore; renomear a rota para "exportação".

---

## 🟠 ALTO

### Segurança
- **A1. Arquivos servidos sem autorização por dono** — `src/app/api/arquivos/[...caminho]/route.ts`: path traversal está bloqueado (correto), mas qualquer usuário logado baixa qualquer arquivo se souber o caminho; a única barreira é o prefixo aleatório de 12 hex no nome.
- **A2. Upload sem allowlist de tipo** — `src/app/api/upload/route.ts`: aceita qualquer MIME até 25 MB; XML depois é servido inline como `application/xml`. Adicionar allowlist + `Content-Disposition: attachment` para tipos não-imagem/PDF.
- **A3. Defesa em camada única** — rotas sensíveis (`folha-detalhada`, `funcionarios` — retorna CPF/salário/dados bancários —, `backup`, `rh-ocorrencias`) dependem só do `startsWith` do middleware; os handlers não revalidam papel. `rh-ocorrencias` só está protegida **por acaso** (prefixo `/api/rh`). Padrão correto já existe no projeto (`exigirAdmin()` em `admin/*` e `configuracoes`) — replicá-lo.
- **A4. Rotas de negócio sem guard de papel** — `clientes` (CNPJ/CPF), `fornecedores`, `contratos`, `medicao`, `combustivel`, `logistica`, `equipamentos`, `oportunidades`, `voz` (custo GROQ, sujeito a abuso) abertas a qualquer papel autenticado.
- **A5. Zero validação de entrada** — nenhuma rota de API importa `zod` (que está no package.json); `prisma.create/update` recebem body cru (mass assignment).

### Dados
- **A6. Uniques ausentes que permitem duplicidade fiscal** — `FiscalLaborCharge` sem `@@unique([competence, employeeId, eventType])` (mesmo INSS lançado 2×); `Measurement` sem `@@unique([contractId, period])` (duas medições do mesmo mês).
- **A7. Índices ausentes em consultas reais** — `competence` (FiscalNfse, FiscalTaxExpense, FiscalLaborCharge, Expense), `Contract.clientId/status`, `Measurement`, `FuelLog`, `Mobilization`. Prisma não indexa FK automaticamente no PostgreSQL — as colunas `xId` de relação estão sem índice de join.
- **A8. Pseudo-FKs em String sem integridade** — `RetroJob`/`DedetJob` usam `clienteNome String + clienteId String?` sem relation (nome diverge do cadastro); idem `FuelLog.employeeId`, `Equipment.contratoId`, `Document.clienteId/contratoId/funcionarioId`, `BidPipeline.*` — órfãos possíveis, joins sem garantia.
- **A9. `ON DELETE SET NULL` em vínculos fiscais** — excluir funcionário/cliente zera a referência de `FiscalLaborCharge`/`FiscalNfse`/`Contract` silenciosamente — ruim para auditoria. Usar `Restrict` em relações fiscais.

### Cálculos
- **A10. INSS patronal de 7% sem base legal** — `folha.ts:58` e default do `hora-homem.ts`. No Simples Anexo IV (limpeza/conservação — o negócio da Verdelimp) a CPP é ~26,8% (20% + RAT×FAP + terceiros), valor que o próprio `tributario.ts:91` usa; nos Anexos III/V está dentro do DAS (0% à parte). O custo patronal da folha está subestimado ou fantasma, conforme o anexo.
- **A11. Rentabilidade ignora mão de obra** — `rentabilidade/route.ts`: `custoTotal = custos lançados + combustível`; o custo de equipe mobilizada é retornado à parte e **não entra na margem** → `margemPct` superestimada.
- **A12. `custoTotal` da folha sem provisões** — `folha.ts:100` soma só bruto+FGTS+patronal; `hora-homem.ts` inclui 13º (8,33%), férias+1/3 (11,11%), rescisão (4%). Dois "custos de funcionário" divergentes ~26% no mesmo sistema.

### Infra/qualidade
- **A13. Sem CI/CD** — não existe `.github/workflows/`; lint desativado no build (`ignoreDuringBuilds: true`); nada impede código quebrado de ir a produção. (TS a favor: `strict: true` e `ignoreBuildErrors: false`.)
- **A14. Sem observabilidade** — zero Sentry/APM/logs estruturados; ~74 rotas devolvem `{ error: e.message }` ao cliente (vaza nomes de tabela/constraint do Prisma).
- **A15. Cobertura de testes ≈ só cálculos** — 47 testes, todos em `src/lib`; 0 testes para 91 rotas de API, auth/middleware, componentes. E parte dos testes é tautológica (reescreve a fórmula do código).
- **A16. Frontend 100% client-side** — 54/56 páginas `"use client"` com fetch em `useEffect` (waterfall duplo com o layout); **zero** `AbortController` (races reais ao trocar filtros); dado obsoleto vence o servidor em `logistica` (`localStorage["verdelimp_os"]` preferido à API).
- **A17. Dashboard sem responsividade** — 2 media queries no projeto inteiro, ~50 grids fixos, sidebar 220px com `overflow:hidden`; só `/campo` é mobile-first, mas a operação abre telas do dashboard no celular.

---

## 🟡 MÉDIO

1. **Dados demo mascarando erro real** — `dre/route.ts:36-48` e `medicao` devolvem números **fabricados** (`_demo: true`) quando o banco falha. Num relatório financeiro, falha silenciosa virando dado plausível é perigoso: preferir erro explícito.
2. **RBT12 por `createdAt`** (`tributario/route.ts:15`) em vez de competência — NFS-e lançada com atraso cai na janela errada.
3. **Apuração usa DAS flat** (`fiscal-calc.ts:38,57`, default 6,72%) ignorando o motor progressivo correto de `tributario.ts` (`aliquotaEfetivaSimples`).
4. **Fuso horário** — `new Date("YYYY-MM-DD")` cria meia-noite UTC: vencimentos podem exibir um dia antes (`fiscal-calc.ts:146`); competência da medição gerada em UTC pode pular de mês à noite.
5. **FGTS com vencimento dia 7** (`fiscal-calc.ts:69`) — FGTS Digital mudou para dia 20; sem ajuste de dia útil.
6. **ISS Betim hardcoded sem data de vigência** (`iss-betim.ts`) — mapa cita "LC 33/2003 e atualizações"; validar alíquotas vigentes com o contador.
7. **Enums como String livre** — praticamente todo `status`/`tipo` do schema é String com o domínio em comentário ("Ativo" vs "ativo" quebra filtro). Converter para `enum` Prisma.
8. **`competence`/`period` como String "YYYY-MM"** — funciona por zero-padding, mas impede range query nativa; documentar formato estrito ou adicionar coluna DateTime.
9. **Senha default do seed versionada** — `seed.ts:62` `"Verdelimp@2026"` como fallback (mitigado por bcrypt 12 + `mustChangePass`); PII real no seed (e-mails, CNPJ). Abortar seed em produção sem `SEED_ADMIN_PASSWORD`.
10. **Senha provisória com `Math.random()`** (`src/lib/admin.ts`) — usar `crypto.randomInt`.
11. **Sem rate limiting** em upload/IA/portal; sem verificação de origem em mutações (mitigado por SameSite=Lax).
12. **Sem rollback de deploy** — `deploy.sh` faz pull+build+migrate+up sem tag de imagem nem plano de reversão; VPS única compartilhada com outros sistemas (SPOF).
13. **Duplicação frontend massiva** — o trio fetch+form+tabela se repete em ~45 páginas (153 `fetch(`); um hook `useRecurso<T>` com abort/loading/erro eliminaria centenas de linhas e as races.
14. **678 `any` em 147 arquivos** — respostas de API sem tipo; nenhum DTO compartilhado com o backend (que é Prisma e poderia gerar os tipos).
15. **Erros engolidos no frontend** — `catch {}` silencioso em várias telas; listagens sem estado de erro/loading (13/56 páginas têm loading); `alert()`/`confirm()` remanescentes.
16. **Acessibilidade** — `htmlFor`/`id` só no login; 30 tabelas sem `caption`/`scope`; botões-ícone sem `aria-label`; mensagens de erro sem `aria-live`.
17. **Imagem Docker gorda** — sem `output: "standalone"`; o runner carrega `node_modules` completo com devDependencies. (A favor: multi-stage, non-root, healthchecks, Postgres não exposto, uploads em volume.)
18. **NFS-e sem unique de número**; férias sem unique de período aquisitivo; BDI/percentuais guardados em `Json` sem validação de shape.

## 🟢 BAIXO (seleção)

- `Number(x.toFixed(2))` espalhado — preferir aritmética em centavos; drift de centavos possível no total do BDI (`precificacao-bdi:51-53`).
- `|| default` engolindo zeros legítimos (`item.encargos || 0.70`, `i.quantidade || 1`) — usar `??`.
- Rótulo "S = Seguro + Garantia" convivendo com campo `G` separado no BDI — risco de o usuário lançar garantia duas vezes.
- CSP com `unsafe-inline`/`unsafe-eval` (tradeoff Next 14 documentado); tags CSV dentro de String; hex hardcoded fora de `tema.ts`; `bcryptjs` 2.x (JS puro, lento) — considerar `bcrypt` nativo/argon2.
- `api-cache.ts` é cache server-side de dados públicos sem escopo por usuário — inofensivo hoje, documentar limite antes que alguém cacheie dado sensível.

---

## ✅ O que está bem feito (méritos verificados)

1. **`Decimal` em 100% dos campos monetários/alíquotas** — o erro clássico de Float em dinheiro não existe no schema.
2. **Sem SQL injection** — nenhum `queryRawUnsafe`; só tagged templates parametrizados; sem XXE explorável no parser atual (mas atualizar a lib — C4).
3. **Portal do cliente bem desenhado** — token `randomBytes(32)` (256 bits), expiração, emissão restrita a ADMIN/COMERCIAL, ownership validado (sem IDOR).
4. **Login robusto** — bcrypt custo 12, lockout 5 tentativas/15 min, `mustChangePass`, sessão JWT 8h.
5. **Path traversal bloqueado** no serviço de arquivos (`path.resolve` + prefixo).
6. **Migrations disciplinadas** — `prisma migrate deploy` em produção (não `db push`), 6 migrations consistentes com o schema.
7. **Docker correto no essencial** — multi-stage, non-root, healthchecks, restart policy, Postgres só na rede interna, app atrás do Nginx em 127.0.0.1.
8. **Headers de segurança fortes** — HSTS, X-Frame-Options DENY, nosniff, frame-ancestors.
9. **`strict: true` no TypeScript e typecheck limpo**; 47 testes de cálculo passando.
10. **Design system iniciado** (`tema.ts`, `ui.tsx`, `nav-grupos.ts`) e boa documentação operacional (`SYSTEM_MAP.md`, `DEPLOY_CONTABO.md`).

---

## 📋 Plano de ação sugerido (ordem de execução)

| # | Ação | Esforço | Risco que elimina |
|---|------|---------|-------------------|
| 1 | Autorização no GED (`/api/documentos`) + guards nas rotas órfãs + revalidação de papel nos handlers sensíveis | 1-2 dias | Vazamento de holerite/CPF/contrato (C1, A3, A4) |
| 2 | Atualizar tabelas INSS/IRRF/mínimo 2026, versionadas por ano, com teste de vigência | 1 dia | Retenção errada na folha (C2) |
| 3 | Filtrar tipo de categoria na DRE (e revisar rentabilidade p/ incluir mão de obra) | 0,5 dia | DRE e margem mentindo (C3, A11) |
| 4 | `npm update fast-xml-parser nodemailer` + `npm audit` como gate | 0,5 dia | RCE/DoS na importação de NF-e (C4) |
| 5 | Backup off-site (rclone/S3) + tar de uploads + restore testado | 1 dia | Perda total de dados (C5) |
| 6 | CI GitHub Actions: `tsc` + `vitest` + `lint` + `npm audit` + `prisma migrate diff` | 0,5 dia | Regressão silenciosa (A13) |
| 7 | Uniques e índices do schema (migration única) | 1 dia | Duplicidade fiscal e lentidão futura (A6, A7) |
| 8 | Patronal por anexo (26,8% Anexo IV) + unificar custo pleno folha × hora-homem | 1-2 dias | Precificação subestimada (A10, A12) |
| 9 | Validação zod nas rotas de escrita + erro genérico no 500 + Sentry/UptimeRobot | 2-3 dias | Mass assignment, vazamento de schema, cegueira operacional (A5, A14) |
| 10 | Hook `useRecurso` (abort+loading+erro) + responsividade do dashboard | contínuo | Races, UX de campo (A16, A17) |

**Veredicto geral:** o sistema é funcional, bem documentado e acertou nos fundamentos difíceis (Decimal, migrations, Docker, portal externo). Os riscos reais estão em três frentes: **autorização incompleta** (uma camada só, com furos no GED), **números fiscais defasados/incorretos** (tabelas 2024 rotuladas 2026, patronal 7%, DRE em double-count) e **operação sem rede de proteção** (backup na própria VPS, sem CI, sem monitoramento). Nada disso exige reescrita — são correções pontuais e bem localizadas, na ordem do plano acima.
