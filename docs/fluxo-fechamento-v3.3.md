# Verdelimp v3.3 — fechamento operacional e financeiro

Fluxo alvo desta etapa:

Contrato ativo → diário de campo aceito → medição → aprovação → faturamento gerencial → título a receber → recebimento → rentabilidade.

Regras:

- nenhum dado de demonstração pode substituir falha real de banco;
- toda transição crítica exige autenticação, autorização e auditoria;
- somente diários aceitos pelo cliente podem compor medição automática;
- medição aprovada não pode ser alterada silenciosamente;
- faturamento é idempotente: uma medição gera no máximo uma NFS-e gerencial e um título a receber;
- NFS-e gerencial não equivale à emissão oficial no portal fiscal;
- receita contratual não deve ser lançada como despesa;
- recebimentos parciais atualizam saldo e situação do título;
- rentabilidade deve distinguir faturado, recebido, custos registrados e custos operacionais estimados.
