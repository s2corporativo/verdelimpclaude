# Hotfix Verdelimp v3.10.1

## Motivo

Atualizações da VPS executam migrations, mas não executam o seed inicial. Por isso, o papel `DIRETORIA` precisa ser provisionado por migration para também existir em bancos já instalados.

## Comportamento

- cria ou atualiza o papel `DIRETORIA` de forma idempotente;
- associa as permissões empresariais existentes, exceto o módulo administrativo;
- não altera usuários ou atribui automaticamente o papel a pessoas;
- não executa seed durante o deploy;
- aborta a migration se o papel ou as permissões não forem criados;
- altera a release de saúde para `v3.10.1`.

## Validação esperada

O pipeline deve aplicar toda a cadeia de migrations em PostgreSQL 16, executar o seed estrutural sem dados operacionais fictícios e concluir o build de produção. Na VPS, `/api/health` deve retornar `"release":"v3.10.1"`.
