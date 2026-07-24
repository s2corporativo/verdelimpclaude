# Critérios de aceite — Verdelimp v3.10

## Objetivo

Eliminar riscos transversais remanescentes de dados demonstrativos, vínculo comercial frágil, diagnóstico sem proteção e deploy sem comprovação da release executada.

## Seed e papéis

- O seed padrão cria apenas dados estruturais indispensáveis.
- Funcionários, veículos e usuários de demonstração só podem ser criados quando `SEED_DEMO_DATA=true` e `NODE_ENV` não for `production`.
- O seed deve abortar quando `SEED_DEMO_DATA=true` em produção.
- O papel `DIRETORIA` deve existir e receber as permissões empresariais, sem acesso automático ao módulo administrativo.
- Uma falha no seed deve resultar em código de saída diferente de zero.
- Registros operacionais existentes não são apagados automaticamente durante a atualização.

## Demanda → dossiê → proposta → contrato

- `ServiceDossier` possui coluna física `opportunityId`, índice único e chave estrangeira para `Opportunity`.
- O legado `sourceName=OPPORTUNITY:<id>` é migrado sem exclusão.
- Havendo duplicidade legada, somente o dossiê mais antigo recebe o vínculo; os demais permanecem preservados para revisão.
- A conversão da demanda usa bloqueio transacional e é idempotente.
- O pipeline é sincronizado automaticamente:
  - dossiê vinculado: `qualificado`;
  - proposta criada ou em aprovação: `proposta`;
  - proposta aprovada: `negociacao`;
  - proposta rejeitada: `qualificado`;
  - contrato criado ou proposta convertida: `ganho`.
- Os gatilhos não devem reabrir automaticamente demandas arquivadas ou perdidas, exceto quando houver contrato efetivamente criado.

## Portal do cliente

- Erros de banco não podem retornar contratos, medições ou diários fictícios.
- A emissão de acesso exige usuário interno autorizado e cliente ativo.
- Uma decisão só pode atingir medição pertencente ao cliente do token.
- Somente medição com status `enviada` pode ser aprovada ou contestada.
- Contestação resulta em `glosada`, compatível com o fluxo de medição.
- Aprovação e contestação são auditadas.
- Observações anteriores da medição são preservadas.

## Diagnóstico

- A rota exige papel `ADMIN`, `GESTOR` ou `DIRETORIA`.
- O diagnóstico valida banco, migrations, papel DIRETORIA, segredo de sessão, integrações, ASOs, mobilizações, documentos e matriz contratual.
- O diagnóstico identifica IDs conhecidos dos seeds demonstrativos, mas não exclui dados.
- Orientações operacionais devem usar `docker compose run --rm migrate`, nunca executar Prisma dentro da imagem standalone da aplicação.

## Exportação

- A exportação é identificada explicitamente como gerencial e não restaurável.
- CSV aplica escape de aspas, BOM UTF-8 e ignora lançamentos arquivados.
- Exportações são auditadas.
- JSON inclui release, usuário responsável, contagens e os módulos comerciais/operacionais tratados.

## Deploy e health check

- `/api/health` retorna `ok`, banco, nome do sistema, versão, release e horário da verificação.
- O deploy extrai a release esperada de `src/lib/system-version.ts`.
- O deploy só conclui quando o endpoint retorna `ok:true` e a mesma release esperada.
- Falha de saúde ou divergência de release aciona o rollback da imagem da aplicação.
- Migrations não são revertidas automaticamente; o backup pré-deploy continua obrigatório.

## CI obrigatório

- Prisma Generate e Validate.
- TypeScript sem erros.
- Vitest e lint aprovados.
- Sintaxe dos scripts e Docker Compose válidos.
- Auditoria de dependências sem vulnerabilidade alta em produção.
- Build de produção aprovado.
- Cadeia completa de migrations aplicada em PostgreSQL 16.
- Seed executado com código de saída válido.
- CI confirma:
  - papel `DIRETORIA` presente;
  - nenhum funcionário ou veículo demonstrativo criado;
  - coluna e chave estrangeira demanda–dossiê presentes;
  - dois gatilhos de sincronização do pipeline presentes.

## Validação na VPS

Após o deploy:

```bash
cd /opt/verdelimp-erp
git log -2 --oneline
docker compose ps
curl -fsS http://127.0.0.1:${APP_PORT:-3010}/api/health
docker compose logs --tail=80 app
```

O health check esperado deve conter `"ok":true` e `"release":"v3.10.0"`.
