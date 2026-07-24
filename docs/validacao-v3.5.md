# Verdelimp v3.5 — integridade operacional

## Escopo

Esta etapa remove fallbacks fictícios e fortalece os módulos de EPI, combustível, logística, retroescavadeira e equipamentos.

## Critérios de aceite

### EPI

- banco vazio retorna listas vazias e indicadores zerados;
- falha de banco retorna erro controlado, sem dados inventados;
- entrega exige EPI ativo, funcionário ativo, quantidade positiva e estoque suficiente;
- baixa de estoque ocorre na mesma transação da entrega;
- devolução não pode superar o saldo entregue;
- item só retorna ao estoque nas condições NEW ou GOOD;
- entrega e devolução geram trilha de auditoria.

### Combustível

- somente veículos ativos podem receber abastecimento;
- litros, preço e hodômetro são positivos e validados;
- hodômetro deve respeitar a sequência histórica anterior e posterior;
- vínculo opcional com contrato e funcionário é validado;
- totais do mês usam apenas registros reais;
- criação gera trilha de auditoria.

### Logística

- ordens vêm exclusivamente de `erp_work_order`;
- não há localStorage como fonte de verdade;
- nova OS é gravada pela API de ordens de serviço;
- alteração de status respeita os bloqueios de checklist, fotos e assinaturas;
- plano de IA usa somente IDs reais de OS, funcionários e veículos;
- respostas da IA são validadas por schema e por listas de IDs permitidos;
- planos são persistidos em `erp_logistics_plan` e podem ser aprovados;
- migration é aditiva e não altera OS existentes.

### Retroescavadeira

- lista vazia não gera jobs fictícios;
- custos padrão são identificados como configuração default, não como dados cadastrados;
- configuração persistida tem validação e auditoria;
- criação valida cliente e contrato quando informados;
- despesas estimadas são criadas em transação;
- mudança de status recalcula margem real e gera auditoria.

### Equipamentos

- criação, manutenção, documento, revisão e mudança de status são validados;
- manutenção atualiza o status do equipamento de forma transacional;
- aprovação documental exige arquivo;
- rejeição exige motivo;
- arquivamento é lógico e bloqueado quando existe reserva ativa;
- todas as operações críticas geram auditoria.

## Validações automatizadas obrigatórias

1. Prisma generate;
2. Prisma validate;
3. TypeScript;
4. testes Vitest;
5. lint;
6. scripts operacionais;
7. Docker Compose;
8. npm audit de produção;
9. build de produção;
10. cadeia completa de migrations em PostgreSQL real;
11. seed.

A PR só pode ser mesclada após os dois jobs do CI concluírem com sucesso.
