# Homologação e entrada em produção — Verdelimp ERP v2.3

Este documento é o roteiro obrigatório para transformar o código versionado em operação real, rastreável e auditável. Nenhum item deve ser marcado como concluído sem evidência objetiva.

## 1. Critério de status

- **Código concluído:** alteração presente na branch principal e aprovada pelo CI.
- **Implantado:** commit identificado está executando na VPS e a migration correspondente consta como aplicada.
- **Configurado:** parâmetros reais foram cadastrados e revisados por responsável identificado.
- **Homologado:** teste de ponta a ponta foi executado com evidências e resultado esperado.
- **Produção liberada:** todos os bloqueadores deste documento foram atendidos.

## 2. Bloqueadores de produção

A liberação é proibida enquanto qualquer item abaixo estiver pendente:

1. backup completo de banco e uploads realizado fora da VPS;
2. ensaio de restauração aprovado;
3. migration `20260721210000_dossie_operacional` aplicada;
4. aplicação e PostgreSQL com healthcheck regular;
5. perfil tributário ativo e validado pelo contador;
6. pelo menos um perfil documental real por cliente piloto;
7. custos de mão de obra, equipamentos, insumos e mobilização revisados;
8. fluxo completo de dossiê, proposta, contrato, mobilização, execução, medição e rentabilidade homologado;
9. permissões testadas com usuários de papéis distintos;
10. plano de rollback e responsáveis registrados.

## 3. Implantação controlada na VPS

### 3.1. Preparação

```bash
cd /opt/verdelimp-erp
git status --short
git fetch origin
git log -1 --oneline origin/main
cp deploy/contabo/ops-config.example .env.ops
chmod 600 .env.ops
nano .env.ops
```

Em `.env.ops`, configurar obrigatoriamente:

- `BACKUP_DIR`;
- `RCLONE_REMOTE`;
- `REQUIRE_OFFSITE=true`;
- limite de uso de disco;
- idade máxima de backup;
- endpoints de alerta ou heartbeat, quando utilizados.

### 3.2. Configurar rotina operacional

```bash
chmod +x deploy/contabo/configure-operations.sh
deploy/contabo/configure-operations.sh
```

### 3.3. Backup e restauração antes do deploy

```bash
deploy/contabo/backup.sh
deploy/contabo/restore-test.sh
```

Guardar como evidência:

- data e hora;
- nomes dos arquivos;
- tamanhos;
- checksums;
- destino off-site;
- quantidade de tabelas e migrations restauradas;
- quantidade de entradas recuperadas do volume de uploads.

### 3.4. Deploy

```bash
deploy/contabo/deploy.sh
```

O script deve:

1. impedir deploy com alterações locais;
2. executar backup prévio;
3. preservar a imagem anterior;
4. atualizar somente por avanço linear da branch `main`;
5. construir a imagem;
6. aplicar migrations;
7. aguardar healthcheck;
8. validar `/api/health`;
9. restaurar a imagem anterior se a aplicação não ficar saudável.

As migrations não são revertidas automaticamente. Em falha de schema, usar o backup pré-deploy e procedimento controlado de restauração.

### 3.5. Evidência da versão implantada

```bash
cd /opt/verdelimp-erp
git rev-parse HEAD
docker compose ps
docker compose logs --tail=100 app
docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c 'SELECT migration_name, finished_at FROM "_prisma_migrations" ORDER BY finished_at DESC LIMIT 10;'
curl -fsS http://127.0.0.1:${APP_PORT:-3010}/api/health
```

## 4. Cadastros obrigatórios

## 4.1. Perfil tributário

Cadastrar uma versão vigente contendo, no mínimo:

- regime tributário;
- anexo do Simples aplicável ao serviço;
- RBT12 e alíquota efetiva;
- município de incidência do ISS;
- código e natureza do serviço;
- CPP patronal aplicável;
- RAT e FAP;
- retenção de INSS e possibilidade de compensação;
- IRRF e retenções federais;
- prazo médio de pagamento;
- taxa de capital de giro;
- data de início da vigência;
- responsável pela validação contábil.

### Critério de aceite

Um orçamento deve reproduzir os cálculos manuais aprovados pelo contador, com diferença máxima restrita a arredondamentos documentados.

## 4.2. Perfis documentais

Criar versões específicas para os clientes recorrentes, começando pelo contrato piloto. Cada requisito deve conter:

- sujeito: empresa, funcionário, função, atividade, equipamento ou veículo;
- documento exigido;
- validade;
- antecedência mínima;
- caráter bloqueante;
- fonte automática ou revisão manual;
- papel autorizado para aprovar;
- fundamento contratual ou normativo.

### Critério de aceite

Um recurso com documento ausente, vencido, rejeitado ou incompatível deve permanecer bloqueado. Após correção, a ação **Reavaliar** deve liberar somente quando todas as regras forem atendidas.

## 4.3. Mão de obra

Revisar por função:

- salário-base;
- jornada;
- benefícios;
- adicionais;
- FGTS;
- parcela patronal;
- férias e adicional de um terço;
- 13º salário;
- provisão rescisória;
- exames, treinamentos, uniformes e EPIs;
- custo pleno por hora paga.

### Critério de aceite

O custo de mão de obra utilizado no orçamento, na folha e na rentabilidade deve partir da mesma base versionada, sem percentuais genéricos conflitantes.

## 4.4. Composições de serviços

Cadastrar e validar, conforme a operação real:

- roçada manual;
- roçada mecanizada;
- roçada com robô;
- capina;
- limpeza e recolhimento;
- poda e supressão;
- plantio e manutenção de áreas verdes;
- retroescavadeira;
- dedetização;
- atividades com munck;
- trabalho em altura;
- demais serviços efetivamente comercializados.

Cada composição deve conter unidade, produtividade por HH, equipe mínima, preparação, eficiência, insumos, equipamentos, transporte, descarte e riscos.

### Critério de aceite

A produtividade cadastrada deve ser comparada com pelo menos três execuções reais ou, enquanto não houver histórico suficiente, ser identificada expressamente como premissa técnica provisória.

## 4.5. Equipamentos e veículos

Cadastrar ativos reais, custos, documentos, disponibilidade e restrições. Incluir, no mínimo, os equipamentos e veículos efetivamente disponíveis na Verdelimp.

### Critério de aceite

O mesmo equipamento ou veículo não pode ser confirmado em serviços incompatíveis no mesmo período.

## 5. Homologação funcional de ponta a ponta

Executar com um edital, termo de referência, e-mail ou escopo real controlado.

| Etapa | Teste obrigatório | Evidência |
|---|---|---|
| Importação | PDF/TXT e escopo manual | arquivo e protocolo |
| Extração | objeto, local, prazo, quantidades, requisitos e riscos | trechos de origem |
| Validação | correção humana antes do cálculo | usuário, data e alterações |
| Composição | atividades, produtividade, equipe e custos | versão da composição |
| Dimensionamento | HH, trabalhadores e duração | memória de cálculo |
| Reserva | conflito de funcionário e equipamento | bloqueio demonstrado |
| Precificação | mínimo, recomendado, comercial e desconto | snapshot da versão |
| Cenários | otimista, base e adverso | relatório comparativo |
| Aprovações | técnica, financeira e diretoria | usuário e timestamp |
| Conversão | proposta aprovada para contrato | vínculo entre versões |
| Documentos | matriz escolhida e monitorada | pendências e liberações |
| Mobilização | bloqueio e reavaliação | motivo explícito |
| Execução | diário, HH, produção, insumos e equipamentos | registros de campo |
| Escopo | alteração formal antes de executar extra | solicitação aprovada |
| Medição | quantidade e aceite | medição vinculada |
| Financeiro | receita, custos e retenções | lançamentos rastreáveis |
| Rentabilidade | planejado versus realizado | margem por contrato |

## 6. Testes negativos obrigatórios

1. usuário operacional tentando acessar documento confidencial;
2. upload de tipo não permitido;
3. proposta abaixo do preço mínimo;
4. conversão de versão antiga ou não aprovada;
5. dupla medição no mesmo contrato e competência;
6. duplo faturamento da mesma medição;
7. funcionário reservado em dois serviços simultâneos;
8. equipamento reservado em dois serviços simultâneos;
9. mobilização com ASO ou treinamento vencido;
10. tentativa de alterar proposta após aprovações sem gerar nova versão;
11. falha simulada da IA sem criação de fatos fictícios;
12. falha de banco sem exibição de dados demonstrativos como se fossem reais.

## 7. Segurança e permissões

Criar usuários de teste para cada papel e preencher uma matriz de acesso contendo:

- módulo;
- ação de leitura;
- ação de criação;
- ação de alteração;
- ação de exclusão;
- acesso a dados confidenciais;
- resultado esperado;
- resultado obtido.

O teste deve cobrir também acesso direto às rotas da API, não apenas ocultação de menus.

## 8. Monitoramento operacional

Após a implantação:

```bash
deploy/contabo/monitor.sh
crontab -l
ls -lh /var/log/verdelimp/
```

O monitor deve alertar sobre:

- aplicação fora do ar;
- healthcheck não saudável;
- PostgreSQL indisponível;
- uso excessivo de disco;
- backup ausente, antigo ou corrompido;
- falha de uploads.

## 9. Registro de aceite

Preencher ao final:

| Responsabilidade | Nome | Data | Resultado | Ressalvas |
|---|---|---|---|---|
| Técnica do sistema |  |  |  |  |
| Operação Verdelimp |  |  |  |  |
| Financeiro |  |  |  |  |
| Contabilidade |  |  |  |  |
| SST/RH |  |  |  |  |
| Diretoria |  |  |  |  |

## 10. Decisão final

A produção somente será liberada quando:

- todos os bloqueadores estiverem concluídos;
- o ensaio de restauração estiver aprovado;
- o fluxo piloto terminar sem inconsistência crítica;
- os cálculos fiscais e trabalhistas tiverem validação responsável;
- riscos residuais estiverem registrados e aceitos pela diretoria.
