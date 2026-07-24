-- Compatibilidade entre o campo Prisma "pdfLink" e consultas SQL que usam pdf_link.
-- A coluna é gerada a partir da original: não duplica fonte de verdade e não aceita escrita direta.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'FiscalNfse'
      AND column_name = 'pdf_link'
  ) THEN
    ALTER TABLE "FiscalNfse"
      ADD COLUMN pdf_link TEXT GENERATED ALWAYS AS ("pdfLink") STORED;
  END IF;
END $$;
