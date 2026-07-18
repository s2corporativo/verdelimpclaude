-- Armazenamento das notas emitidas pelo Portal Nacional (gov.br):
-- guarda a chave de acesso e o link do PDF/DANFSE informados após a emissão
-- manual no Emissor Nacional. Colunas opcionais — não afetam registros existentes.
ALTER TABLE "FiscalNfse" ADD COLUMN "accessKey" TEXT;
ALTER TABLE "FiscalNfse" ADD COLUMN "pdfLink" TEXT;
