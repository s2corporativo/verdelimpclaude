# Verdelimp v3.6 — integridade de RH, GED e serviços especializados

## RH

- consulta vazia retorna lista vazia, sem funcionários fictícios;
- falha técnica retorna erro controlado;
- CPF é normalizado e protegido por unicidade;
- admissão exige data e salário válidos;
- edição e desligamento possuem autorização e auditoria;
- desligamento é bloqueado enquanto houver mobilização ou reserva ativa;
- indicadores usam documentos, treinamentos e ASOs reais;
- a tela informa folha nominal, sem transformar percentuais genéricos em obrigação tributária confirmada.

## GED

- banco vazio não gera documentos, alertas ou contagens fictícias;
- paginação, filtros e status são validados;
- estatísticas respeitam a mesma regra de confidencialidade da listagem;
- download de documento confidencial exige alçada por categoria;
- criação valida vínculo com cliente, contrato e funcionário;
- upload local da VPS é normalizado para estratégia URL;
- base64 respeita limite de tamanho;
- nova versão arquiva logicamente a anterior em transação;
- versão substituída não pode ser reativada;
- criação, download, status, versionamento e arquivamento geram auditoria.

## Dedetização

- lista vazia não gera serviços fictícios;
- catálogo vazio não retorna produtos ou registros sanitários inventados;
- tipos exibidos com ou sem acento são normalizados para valores canônicos;
- cálculo de viabilidade identifica explicitamente premissas estimadas;
- produto cadastrado é validado antes do uso;
- cliente e técnico são validados quando informados;
- produtos utilizados são copiados do catálogo real para o serviço em transação;
- conclusão exige data da aplicação;
- certificado emitido exige validade;
- criação e transições geram auditoria.

## Validação automatizada obrigatória

Prisma generate/validate, TypeScript, Vitest, lint, scripts operacionais, Docker Compose, npm audit, build de produção, cadeia completa de migrations em PostgreSQL real e seed.
