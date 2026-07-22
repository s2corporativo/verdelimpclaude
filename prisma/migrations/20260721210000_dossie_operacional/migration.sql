-- AlterTable
ALTER TABLE "WorkDiary" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "acceptedBy" TEXT,
ADD COLUMN     "clientAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "compositionId" TEXT,
ADD COLUMN     "endTime" TEXT,
ADD COLUMN     "equipmentCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "inputCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "laborHours" DECIMAL(10,2),
ADD COLUMN     "quantityDone" DECIMAL(15,3),
ADD COLUMN     "quantityUnit" TEXT,
ADD COLUMN     "startTime" TEXT,
ADD COLUMN     "transportCost" DECIMAL(15,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Mobilization" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "blockedReason" TEXT,
ADD COLUMN     "complianceStatus" TEXT NOT NULL DEFAULT 'pendente';

-- Preserve the state of mobilizations that were already active before the
-- compliance workflow existed. New mobilizations still start as pending.
UPDATE "Mobilization"
SET "complianceStatus" = 'liberada',
    "approvedBy" = 'migração v2.3',
    "approvedAt" = CURRENT_TIMESTAMP
WHERE "status" = 'ativa';

-- AlterTable
ALTER TABLE "ContractDocRequirement" ADD COLUMN     "activity" TEXT,
ADD COLUMN     "blocking" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "equipmentType" TEXT,
ADD COLUMN     "leadTimeDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "origin" TEXT NOT NULL DEFAULT 'CONTRATO',
ADD COLUMN     "role" TEXT;

-- AlterTable
ALTER TABLE "ContractDocRecord" ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pendente';

-- Existing records were accepted by the legacy flow. Keep that historical
-- decision and require review only for records created after this migration.
UPDATE "ContractDocRecord"
SET "status" = 'aprovado',
    "reviewedBy" = 'migração v2.3',
    "reviewedAt" = CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "ServiceDossier" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'rascunho',
    "sourceType" TEXT NOT NULL DEFAULT 'MANUAL',
    "sourceName" TEXT,
    "sourceHash" TEXT,
    "sourceText" TEXT,
    "extraction" JSONB,
    "evidence" JSONB,
    "extractionStatus" TEXT NOT NULL DEFAULT 'pendente',
    "validationStatus" TEXT NOT NULL DEFAULT 'pendente',
    "validatedBy" TEXT,
    "validatedAt" TIMESTAMP(3),
    "clientId" TEXT,
    "proposalId" TEXT,
    "contractId" TEXT,
    "taxProfileId" TEXT,
    "requirementProfileId" TEXT,
    "location" TEXT,
    "startDate" TIMESTAMP(3),
    "deadlineDays" INTEGER,
    "paymentTermDays" INTEGER NOT NULL DEFAULT 30,
    "mobilizationCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "demobilizationCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "overheadRate" DECIMAL(7,4) NOT NULL DEFAULT 10,
    "riskRate" DECIMAL(7,4) NOT NULL DEFAULT 5,
    "marginRate" DECIMAL(7,4) NOT NULL DEFAULT 20,
    "workingCapitalRate" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "calculation" JSONB,
    "riskMatrix" JSONB,
    "qualityScore" INTEGER NOT NULL DEFAULT 0,
    "decisionScore" INTEGER NOT NULL DEFAULT 0,
    "minimumPrice" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "recommendedPrice" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "commercialPrice" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "discountLimit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceDossier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceComposition" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "laborRole" TEXT,
    "quantity" DECIMAL(15,3) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'm²',
    "productivityPerHour" DECIMAL(15,4) NOT NULL DEFAULT 1,
    "teamSize" INTEGER NOT NULL DEFAULT 1,
    "hoursPerDay" DECIMAL(8,2) NOT NULL DEFAULT 8,
    "workDaysPerWeek" INTEGER NOT NULL DEFAULT 5,
    "efficiencyFactor" DECIMAL(7,4) NOT NULL DEFAULT 1,
    "setupHours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "laborHourlyCost" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "inputUnitCost" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "equipmentDailyCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "transportCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "additionalCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "plannedLaborHours" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "plannedDays" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "plannedWorkers" INTEGER NOT NULL DEFAULT 1,
    "directCost" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceComposition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "regime" TEXT NOT NULL DEFAULT 'Simples Nacional',
    "effectiveRate" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "issRate" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "issRetained" BOOLEAN NOT NULL DEFAULT false,
    "issIncludedInEffectiveRate" BOOLEAN NOT NULL DEFAULT true,
    "inssRetentionRate" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "inssRecoverable" BOOLEAN NOT NULL DEFAULT true,
    "irrfRetentionRate" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "csllPisCofinsRetentionRate" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "otherRate" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientRequirementProfile" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "serviceTypes" TEXT[],
    "requirements" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientRequirementProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalVersion" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "price" DECIMAL(15,2) NOT NULL,
    "technicalStatus" TEXT NOT NULL DEFAULT 'pendente',
    "technicalApprovedBy" TEXT,
    "technicalApprovedAt" TIMESTAMP(3),
    "financialStatus" TEXT NOT NULL DEFAULT 'pendente',
    "financialApprovedBy" TEXT,
    "financialApprovedAt" TIMESTAMP(3),
    "directorStatus" TEXT NOT NULL DEFAULT 'pendente',
    "directorApprovedBy" TEXT,
    "directorApprovedAt" TIMESTAMP(3),
    "changeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposalVersion_pkey" PRIMARY KEY ("id")
);

-- Give legacy proposals an immutable baseline version. Approval statuses
-- intentionally remain pending so the new three-level governance is enforced.
INSERT INTO "ProposalVersion" (
    "id", "proposalId", "version", "snapshot", "price", "createdAt"
)
SELECT
    'legacy_' || md5(random()::text || "id"),
    "id",
    1,
    jsonb_build_object('source', 'migration-v2.3', 'proposalNumber', "number"),
    "totalValue",
    COALESCE("createdAt", CURRENT_TIMESTAMP)
FROM "Proposal";

-- CreateTable
CREATE TABLE "ResourceReservation" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT,
    "contractId" TEXT,
    "employeeId" TEXT,
    "equipmentId" TEXT,
    "resourceType" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'provisoria',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentDoc" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "filePath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentDoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScopeChange" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "workDiaryId" TEXT,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reason" TEXT,
    "requestedBy" TEXT,
    "impactDays" INTEGER NOT NULL DEFAULT 0,
    "impactValue" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScopeChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceDossier_code_key" ON "ServiceDossier"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceDossier_proposalId_key" ON "ServiceDossier"("proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceDossier_contractId_key" ON "ServiceDossier"("contractId");

-- CreateIndex
CREATE INDEX "ServiceDossier_clientId_status_idx" ON "ServiceDossier"("clientId", "status");

-- CreateIndex
CREATE INDEX "ServiceDossier_validationStatus_idx" ON "ServiceDossier"("validationStatus");

-- CreateIndex
CREATE INDEX "ServiceDossier_requirementProfileId_idx" ON "ServiceDossier"("requirementProfileId");

-- CreateIndex
CREATE INDEX "ServiceComposition_dossierId_order_idx" ON "ServiceComposition"("dossierId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceComposition_dossierId_code_key" ON "ServiceComposition"("dossierId", "code");

-- CreateIndex
CREATE INDEX "TaxProfile_active_validFrom_idx" ON "TaxProfile"("active", "validFrom");

-- CreateIndex
CREATE UNIQUE INDEX "TaxProfile_name_version_key" ON "TaxProfile"("name", "version");

-- CreateIndex
CREATE INDEX "ClientRequirementProfile_clientId_active_idx" ON "ClientRequirementProfile"("clientId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ClientRequirementProfile_clientId_name_version_key" ON "ClientRequirementProfile"("clientId", "name", "version");

-- CreateIndex
CREATE INDEX "ProposalVersion_proposalId_createdAt_idx" ON "ProposalVersion"("proposalId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalVersion_proposalId_version_key" ON "ProposalVersion"("proposalId", "version");

-- CreateIndex
CREATE INDEX "ResourceReservation_employeeId_startDate_endDate_idx" ON "ResourceReservation"("employeeId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "ResourceReservation_equipmentId_startDate_endDate_idx" ON "ResourceReservation"("equipmentId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "ResourceReservation_dossierId_status_idx" ON "ResourceReservation"("dossierId", "status");

-- CreateIndex
CREATE INDEX "EquipmentDoc_equipmentId_expiresAt_idx" ON "EquipmentDoc"("equipmentId", "expiresAt");

-- CreateIndex
CREATE INDEX "ScopeChange_contractId_status_idx" ON "ScopeChange"("contractId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ScopeChange_contractId_number_key" ON "ScopeChange"("contractId", "number");

-- CreateIndex
CREATE INDEX "WorkDiary_contractId_date_idx" ON "WorkDiary"("contractId", "date");

-- CreateIndex
CREATE INDEX "WorkDiary_compositionId_idx" ON "WorkDiary"("compositionId");

-- AddForeignKey
-- Older diary entries had no enforced contract relation. Null orphaned
-- references before adding the foreign key so deployment remains safe.
UPDATE "WorkDiary" AS diary
SET "contractId" = NULL
WHERE diary."contractId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Contract" AS contract
    WHERE contract."id" = diary."contractId"
  );

ALTER TABLE "WorkDiary" ADD CONSTRAINT "WorkDiary_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkDiary" ADD CONSTRAINT "WorkDiary_compositionId_fkey" FOREIGN KEY ("compositionId") REFERENCES "ServiceComposition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceDossier" ADD CONSTRAINT "ServiceDossier_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceDossier" ADD CONSTRAINT "ServiceDossier_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceDossier" ADD CONSTRAINT "ServiceDossier_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceDossier" ADD CONSTRAINT "ServiceDossier_taxProfileId_fkey" FOREIGN KEY ("taxProfileId") REFERENCES "TaxProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceDossier" ADD CONSTRAINT "ServiceDossier_requirementProfileId_fkey" FOREIGN KEY ("requirementProfileId") REFERENCES "ClientRequirementProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceComposition" ADD CONSTRAINT "ServiceComposition_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "ServiceDossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientRequirementProfile" ADD CONSTRAINT "ClientRequirementProfile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalVersion" ADD CONSTRAINT "ProposalVersion_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceReservation" ADD CONSTRAINT "ResourceReservation_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "ServiceDossier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceReservation" ADD CONSTRAINT "ResourceReservation_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceReservation" ADD CONSTRAINT "ResourceReservation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceReservation" ADD CONSTRAINT "ResourceReservation_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentDoc" ADD CONSTRAINT "EquipmentDoc_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScopeChange" ADD CONSTRAINT "ScopeChange_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScopeChange" ADD CONSTRAINT "ScopeChange_workDiaryId_fkey" FOREIGN KEY ("workDiaryId") REFERENCES "WorkDiary"("id") ON DELETE SET NULL ON UPDATE CASCADE;
