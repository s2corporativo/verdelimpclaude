-- Vínculo estrutural entre demanda comercial e dossiê operacional.
-- O campo é aditivo e preserva o legado baseado em sourceName=OPPORTUNITY:<id>.
ALTER TABLE "ServiceDossier"
  ADD COLUMN IF NOT EXISTS "opportunityId" TEXT;

-- Vincula somente o primeiro dossiê de cada demanda. Duplicidades legadas são
-- preservadas sem vínculo para revisão manual, evitando exclusão automática.
WITH ranked AS (
  SELECT
    d.id,
    substring(d."sourceName" FROM char_length('OPPORTUNITY:') + 1) AS opportunity_id,
    row_number() OVER (
      PARTITION BY substring(d."sourceName" FROM char_length('OPPORTUNITY:') + 1)
      ORDER BY d."createdAt" ASC, d.id ASC
    ) AS position
  FROM "ServiceDossier" d
  WHERE d."sourceName" LIKE 'OPPORTUNITY:%'
), valid_links AS (
  SELECT ranked.id, ranked.opportunity_id
  FROM ranked
  JOIN "Opportunity" o ON o.id = ranked.opportunity_id
  WHERE ranked.position = 1
)
UPDATE "ServiceDossier" d
SET "opportunityId" = valid_links.opportunity_id
FROM valid_links
WHERE d.id = valid_links.id
  AND d."opportunityId" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "ServiceDossier_opportunityId_key"
  ON "ServiceDossier"("opportunityId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ServiceDossier_opportunityId_fkey'
  ) THEN
    ALTER TABLE "ServiceDossier"
      ADD CONSTRAINT "ServiceDossier_opportunityId_fkey"
      FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"(id)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Sincroniza o estágio da demanda quando o dossiê passa a ter proposta ou contrato.
CREATE OR REPLACE FUNCTION verdelimp_sync_opportunity_from_dossier()
RETURNS TRIGGER AS $$
DECLARE
  proposal_status TEXT;
BEGIN
  IF NEW."opportunityId" IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW."contractId" IS NOT NULL OR NEW.status = 'convertido' THEN
    UPDATE "Opportunity"
    SET stage = 'ganho',
        "nextAction" = NULL,
        "nextActionDate" = NULL,
        "updatedAt" = NOW()
    WHERE id = NEW."opportunityId";
    RETURN NEW;
  END IF;

  IF NEW."proposalId" IS NOT NULL THEN
    SELECT status INTO proposal_status
    FROM "Proposal"
    WHERE id = NEW."proposalId";

    UPDATE "Opportunity"
    SET stage = CASE
          WHEN proposal_status = 'Convertida' THEN 'ganho'
          WHEN proposal_status = 'Aprovada' THEN 'negociacao'
          WHEN proposal_status = 'Rejeitada' THEN 'qualificado'
          WHEN stage IN ('ganho', 'perdido', 'arquivado') THEN stage
          ELSE 'proposta'
        END,
        "nextAction" = CASE
          WHEN proposal_status = 'Convertida' THEN NULL
          WHEN proposal_status = 'Aprovada' THEN 'Enviar proposta aprovada ao cliente e acompanhar a negociação'
          WHEN proposal_status = 'Rejeitada' THEN 'Revisar a proposta rejeitada e registrar nova versão'
          WHEN stage IN ('ganho', 'perdido', 'arquivado') THEN "nextAction"
          ELSE 'Concluir as alçadas de aprovação da proposta'
        END,
        "nextActionDate" = CASE WHEN proposal_status = 'Convertida' THEN NULL ELSE "nextActionDate" END,
        "updatedAt" = NOW()
    WHERE id = NEW."opportunityId";
    RETURN NEW;
  END IF;

  UPDATE "Opportunity"
  SET stage = CASE WHEN stage = 'lead' THEN 'qualificado' ELSE stage END,
      "nextAction" = CASE
        WHEN stage = 'lead' OR "nextAction" IS NULL THEN 'Validar escopo, dimensionamento e custos no dossiê operacional'
        ELSE "nextAction"
      END,
      "updatedAt" = NOW()
  WHERE id = NEW."opportunityId"
    AND stage NOT IN ('ganho', 'perdido', 'arquivado');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_service_dossier_sync_opportunity ON "ServiceDossier";
CREATE TRIGGER trg_service_dossier_sync_opportunity
AFTER INSERT OR UPDATE OF "opportunityId", "proposalId", "contractId", status
ON "ServiceDossier"
FOR EACH ROW
EXECUTE FUNCTION verdelimp_sync_opportunity_from_dossier();

-- Sincroniza o pipeline quando a proposta vinculada muda de situação.
CREATE OR REPLACE FUNCTION verdelimp_sync_opportunity_from_proposal()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE "Opportunity" o
  SET stage = CASE
        WHEN NEW.status = 'Convertida' THEN 'ganho'
        WHEN NEW.status = 'Aprovada' THEN 'negociacao'
        WHEN NEW.status = 'Rejeitada' THEN 'qualificado'
        WHEN o.stage IN ('ganho', 'perdido', 'arquivado') THEN o.stage
        ELSE 'proposta'
      END,
      "nextAction" = CASE
        WHEN NEW.status = 'Convertida' THEN NULL
        WHEN NEW.status = 'Aprovada' THEN 'Enviar proposta aprovada ao cliente e acompanhar a negociação'
        WHEN NEW.status = 'Rejeitada' THEN 'Revisar a proposta rejeitada e registrar nova versão'
        WHEN o.stage IN ('ganho', 'perdido', 'arquivado') THEN o."nextAction"
        ELSE 'Concluir as alçadas de aprovação da proposta'
      END,
      "nextActionDate" = CASE WHEN NEW.status = 'Convertida' THEN NULL ELSE o."nextActionDate" END,
      "updatedAt" = NOW()
  FROM "ServiceDossier" d
  WHERE d."proposalId" = NEW.id
    AND d."opportunityId" = o.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_proposal_sync_opportunity ON "Proposal";
CREATE TRIGGER trg_proposal_sync_opportunity
AFTER INSERT OR UPDATE OF status
ON "Proposal"
FOR EACH ROW
EXECUTE FUNCTION verdelimp_sync_opportunity_from_proposal();
