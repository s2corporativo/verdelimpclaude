# Verdelimp v3.4 — integridade de dados mestres e financeiro

## Princípios

1. Banco vazio retorna coleção vazia, nunca dados fictícios.
2. Falha de banco retorna erro técnico controlado, nunca números de demonstração.
3. Cadastros mestres exigem autenticação, autorização, validação e auditoria.
4. Clientes e fornecedores com vínculos não são excluídos silenciosamente.
5. Despesas canceladas não entram nos totais.
6. Receita de NFS-e e receita manual são apresentadas separadamente.
7. NFS-e gerencial não comprova emissão no portal oficial.
8. Confirmação de emissão oficial exige chave de acesso.
9. Datas, valores, categorias, fornecedores e clientes são validados antes da gravação.
10. Respostas vazias incluem `empty: true` para orientar a interface sem inventar conteúdo.

## Escopo desta etapa

- clientes;
- fornecedores;
- contas a pagar/despesas;
- registro e consulta de NFS-e.
