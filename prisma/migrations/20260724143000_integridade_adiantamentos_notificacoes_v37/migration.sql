-- Verdelimp v3.7 — integridade de adiantamentos e notificações
-- Migration aditiva e compatível com instalações que já criaram erp_adiantamento em runtime.

CREATE TABLE IF NOT EXISTS erp_adiantamento (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  competencia TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  notes TEXT,
  created_by TEXT,
  updated_by TEXT,
  discounted_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE erp_adiantamento ADD COLUMN IF NOT EXISTS updated_by TEXT;
ALTER TABLE erp_adiantamento ADD COLUMN IF NOT EXISTS discounted_at TIMESTAMPTZ;
ALTER TABLE erp_adiantamento ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'erp_adiantamento_employee_fk'
  ) THEN
    ALTER TABLE erp_adiantamento
      ADD CONSTRAINT erp_adiantamento_employee_fk
      FOREIGN KEY (employee_id) REFERENCES "Employee"(id) ON DELETE RESTRICT NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'erp_adiantamento_amount_positive_ck'
  ) THEN
    ALTER TABLE erp_adiantamento
      ADD CONSTRAINT erp_adiantamento_amount_positive_ck
      CHECK (amount > 0) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'erp_adiantamento_status_ck'
  ) THEN
    ALTER TABLE erp_adiantamento
      ADD CONSTRAINT erp_adiantamento_status_ck
      CHECK (status IN ('pendente', 'descontado', 'cancelado')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'erp_adiantamento_competencia_ck'
  ) THEN
    ALTER TABLE erp_adiantamento
      ADD CONSTRAINT erp_adiantamento_competencia_ck
      CHECK (competencia ~ '^[0-9]{4}-(0[1-9]|1[0-2])$') NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_adiantamento_employee_competencia
  ON erp_adiantamento(employee_id, competencia);
CREATE INDEX IF NOT EXISTS idx_adiantamento_status_competencia
  ON erp_adiantamento(status, competencia);
CREATE INDEX IF NOT EXISTS idx_adiantamento_created_at
  ON erp_adiantamento(created_at DESC);

-- Estado de leitura das notificações geradas dinamicamente por usuário.
CREATE TABLE IF NOT EXISTS erp_notification_read (
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  notification_key TEXT NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, notification_key)
);

CREATE INDEX IF NOT EXISTS idx_notification_read_user_date
  ON erp_notification_read(user_id, read_at DESC);
