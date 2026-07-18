-- Integridade e desempenho: uniques que impedem duplicidade fiscal e
-- índices para as consultas reais (competência, FKs, status, vencimentos).
--
-- ATENÇÃO: se já houver dados duplicados (mesma medição contrato+período,
-- mesmo encargo competência+funcionário+evento, mesma NFS-e número+município+
-- prestador, mesmo período aquisitivo de férias), o deploy desta migration
-- falha — deduplicar manualmente antes (é sintoma de lançamento em dobro).

-- ── Uniques (anti-duplicidade) ──────────────────────────────────────
CREATE UNIQUE INDEX "FiscalNfse_number_municipality_providerCnpj_key"
  ON "FiscalNfse"("number", "municipality", "providerCnpj");

CREATE UNIQUE INDEX "FiscalLaborCharge_competence_employeeId_eventType_key"
  ON "FiscalLaborCharge"("competence", "employeeId", "eventType");

CREATE UNIQUE INDEX "Measurement_contractId_period_key"
  ON "Measurement"("contractId", "period");

CREATE UNIQUE INDEX "Vacation_employeeId_acqStart_key"
  ON "Vacation"("employeeId", "acqStart");

-- ── Índices de consulta ─────────────────────────────────────────────
CREATE INDEX "Expense_competence_idx" ON "Expense"("competence");
CREATE INDEX "Expense_dueDate_idx" ON "Expense"("dueDate");
CREATE INDEX "Expense_status_idx" ON "Expense"("status");
CREATE INDEX "Expense_categoryId_idx" ON "Expense"("categoryId");
CREATE INDEX "Expense_supplierId_idx" ON "Expense"("supplierId");

CREATE INDEX "FiscalNfse_competence_idx" ON "FiscalNfse"("competence");
CREATE INDEX "FiscalNfse_clientId_idx" ON "FiscalNfse"("clientId");

CREATE INDEX "FiscalLaborCharge_competence_idx" ON "FiscalLaborCharge"("competence");

CREATE INDEX "Contract_clientId_idx" ON "Contract"("clientId");
CREATE INDEX "Contract_status_idx" ON "Contract"("status");
CREATE INDEX "Contract_endDate_idx" ON "Contract"("endDate");

CREATE INDEX "FuelLog_contractId_idx" ON "FuelLog"("contractId");
CREATE INDEX "FuelLog_vehicleId_idx" ON "FuelLog"("vehicleId");
CREATE INDEX "FuelLog_date_idx" ON "FuelLog"("date");

CREATE INDEX "Training_employeeId_idx" ON "Training"("employeeId");
CREATE INDEX "Training_expiresAt_idx" ON "Training"("expiresAt");

CREATE INDEX "EmployeeDoc_employeeId_idx" ON "EmployeeDoc"("employeeId");
CREATE INDEX "EmployeeDoc_expiresAt_idx" ON "EmployeeDoc"("expiresAt");

CREATE INDEX "Measurement_status_idx" ON "Measurement"("status");

CREATE INDEX "Mobilization_contractId_status_idx" ON "Mobilization"("contractId", "status");
CREATE INDEX "Mobilization_employeeId_idx" ON "Mobilization"("employeeId");
