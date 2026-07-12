-- Dependentes do funcionário para dedução do IRRF (aditivo, seguro)
ALTER TABLE "Employee" ADD COLUMN "dependentes" INTEGER NOT NULL DEFAULT 0;
