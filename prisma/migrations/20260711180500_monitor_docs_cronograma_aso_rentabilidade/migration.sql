-- CreateTable
CREATE TABLE "ContractDocRequirement" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'FUNCIONARIO',
    "itemRef" TEXT,
    "validityDays" INTEGER,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "autoSource" TEXT,
    "sourceHint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractDocRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractDocRecord" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "employeeId" TEXT,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "filePath" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractDocRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsoExam" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "examType" TEXT NOT NULL DEFAULT 'periodico',
    "examDate" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "result" TEXT NOT NULL DEFAULT 'apto',
    "doctor" TEXT,
    "crm" TEXT,
    "filePath" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AsoExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleItem" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "activity" TEXT NOT NULL,
    "location" TEXT,
    "team" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planejado',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractCost" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvironmentalRecord" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "number" TEXT,
    "agency" TEXT,
    "contractId" TEXT,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "filePath" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnvironmentalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "prospectName" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "origin" TEXT,
    "serviceType" TEXT,
    "estimatedValue" DECIMAL(15,2),
    "stage" TEXT NOT NULL DEFAULT 'lead',
    "nextAction" TEXT,
    "nextActionDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContractDocRequirement_contractId_idx" ON "ContractDocRequirement"("contractId");

-- CreateIndex
CREATE INDEX "ContractDocRecord_requirementId_employeeId_idx" ON "ContractDocRecord"("requirementId", "employeeId");

-- CreateIndex
CREATE INDEX "AsoExam_employeeId_idx" ON "AsoExam"("employeeId");

-- CreateIndex
CREATE INDEX "ScheduleItem_contractId_date_idx" ON "ScheduleItem"("contractId", "date");

-- CreateIndex
CREATE INDEX "ContractCost_contractId_date_idx" ON "ContractCost"("contractId", "date");

-- CreateIndex
CREATE INDEX "EnvironmentalRecord_expiresAt_idx" ON "EnvironmentalRecord"("expiresAt");

-- CreateIndex
CREATE INDEX "Opportunity_stage_idx" ON "Opportunity"("stage");

-- AddForeignKey
ALTER TABLE "ContractDocRequirement" ADD CONSTRAINT "ContractDocRequirement_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractDocRecord" ADD CONSTRAINT "ContractDocRecord_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "ContractDocRequirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractDocRecord" ADD CONSTRAINT "ContractDocRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsoExam" ADD CONSTRAINT "AsoExam_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleItem" ADD CONSTRAINT "ScheduleItem_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractCost" ADD CONSTRAINT "ContractCost_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvironmentalRecord" ADD CONSTRAINT "EnvironmentalRecord_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

