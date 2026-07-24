# Critérios de aceite — Verdelimp v3.9

## Objetivo

Eliminar dados demonstrativos remanescentes e corrigir semântica, autorização, rastreabilidade e integridade nos relatórios financeiros, SST, mobilizações, propostas e integrações de e-mail.

## DRE e relatório mensal

- nenhuma falha de banco pode retornar valores fictícios;
- ano e competência devem ser validados;
- receita faturada deve vir de NFS-e não canceladas;
- recebimentos devem vir de `erp_receivable_payment`;
- despesas devem excluir categorias de receita e registros cancelados;
- folha atual deve ser apresentada como referência cadastral, sem ser tratada como folha histórica fechada;
- a interface deve distinguir faturamento, recebimento e resultado operacional.

## Aging de contas a receber

- usar exclusivamente títulos de `erp_receivable` e pagamentos vinculados;
- excluir títulos cancelados e títulos sem saldo;
- calcular o saldo líquido após recebimentos parciais;
- classificar por data-base em corrente, 1–30, 31–60, 61–90 e acima de 90 dias;
- banco vazio deve retornar buckets zerados;
- falha técnica deve retornar erro controlado.

## Treinamentos e NRs

- não exibir certificados ou colaboradores fictícios;
- aceitar somente funcionário ativo;
- validar emissão e vencimento;
- impedir duplicidade do mesmo treinamento e período;
- arquivar logicamente, sem exclusão física;
- exigir motivo de arquivamento;
- registrar auditoria de criação e arquivamento;
- respeitar o status cancelado nas consultas e na elegibilidade de mobilização.

## Mobilizações

- validar papéis, contrato, funcionário, período, jornada e duplicidades no lote;
- período deve permanecer dentro da vigência contratual;
- detectar conflito com mobilização ou reserva existente;
- considerar documentos, ASO, treinamento e EPI reais;
- permitir reavaliação, suspensão e encerramento controlados;
- registrar auditoria em todas as alterações;
- não excluir fisicamente mobilizações.

## Propostas

- validar cliente ativo, valores, itens, equipes, taxas e validade;
- gerar número com bloqueio transacional contra concorrência;
- criar versão inicial auditável;
- exigir motivo para nova versão, rejeição e arquivamento;
- impedir alteração de proposta convertida;
- respeitar preço mínimo do dossiê;
- permitir alçada de gestão pelo papel `GESTOR`;
- arquivar logicamente e registrar auditoria.

## E-mail e análise por IA

- IMAP não configurado deve retornar lista vazia e aviso, nunca mensagens fictícias;
- UID deve ser positivo e corresponder a mensagem real;
- análise exige IMAP e GROQ configurados;
- a resposta da IA deve ser JSON validado por schema;
- resposta inválida deve produzir erro 502 controlado;
- a interface não deve oferecer análise ou varredura quando a integração estiver desabilitada.

## Validação técnica obrigatória

- Prisma generate e validate;
- TypeScript;
- testes Vitest;
- lint;
- scripts operacionais;
- Docker Compose;
- auditoria de dependências de produção;
- build de produção;
- cadeia completa de migrations em PostgreSQL real;
- seed.

Nenhum merge deve ocorrer antes da aprovação integral do CI oficial do repositório.
