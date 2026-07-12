-- Adicionais de insalubridade/periculosidade do funcionário (aditivo, seguro)
ALTER TABLE "Employee" ADD COLUMN "insalubridadeGrau" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Employee" ADD COLUMN "periculosidade" BOOLEAN NOT NULL DEFAULT false;
