CREATE TABLE IF NOT EXISTS erp_receivable (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES "Client"(id) ON DELETE RESTRICT,
  contract_id TEXT REFERENCES "Contract"(id) ON DELETE RESTRICT,
  measurement_id TEXT REFERENCES "Measurement"(id) ON DELETE SET NULL,
  nfse_id TEXT REFERENCES "FiscalNfse"(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  document_number TEXT,
  installment_number INTEGER NOT NULL DEFAULT 1,
  installment_total INTEGER NOT NULL DEFAULT 1,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  gross_amount NUMERIC(15,2) NOT NULL,
  retention_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(15,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  cost_center TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_receivable_due ON erp_receivable(status, due_date);
CREATE INDEX IF NOT EXISTS idx_receivable_contract ON erp_receivable(contract_id, due_date);

CREATE TABLE IF NOT EXISTS erp_receivable_payment (
  id TEXT PRIMARY KEY,
  receivable_id TEXT NOT NULL REFERENCES erp_receivable(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payment_method TEXT,
  bank_account TEXT,
  receipt_path TEXT,
  notes TEXT,
  registered_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_receivable_payment ON erp_receivable_payment(receivable_id, paid_at);
