-- Verdelimp ERP v2.4 — expansão transacional
-- Mantém compatibilidade com o schema Prisma atual e cria módulos complementares.

CREATE TABLE IF NOT EXISTS erp_employee_profile (
  employee_id TEXT PRIMARY KEY REFERENCES "Employee"(id) ON DELETE CASCADE,
  date_of_birth DATE,
  rg TEXT,
  rg_issuer TEXT,
  ctps TEXT,
  pis_pasep TEXT,
  voter_id TEXT,
  cnh TEXT,
  cnh_category TEXT,
  cnh_expires_at DATE,
  marital_status TEXT,
  education_level TEXT,
  phone TEXT,
  email TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  street TEXT,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state CHAR(2),
  postal_code TEXT,
  contract_type TEXT DEFAULT 'CLT',
  weekly_hours NUMERIC(8,2) DEFAULT 44,
  work_schedule TEXT,
  union_name TEXT,
  collective_agreement TEXT,
  cost_center TEXT,
  termination_date DATE,
  termination_reason TEXT,
  termination_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_role_sst_matrix (
  id TEXT PRIMARY KEY,
  role_name TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  pgr_reference TEXT,
  pcmso_reference TEXT,
  activities JSONB NOT NULL DEFAULT '[]'::jsonb,
  risks JSONB NOT NULL DEFAULT '[]'::jsonb,
  exams JSONB NOT NULL DEFAULT '[]'::jsonb,
  trainings JSONB NOT NULL DEFAULT '[]'::jsonb,
  epis JSONB NOT NULL DEFAULT '[]'::jsonb,
  mandatory_documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role_name, version)
);
CREATE INDEX IF NOT EXISTS idx_role_sst_active ON erp_role_sst_matrix(role_name, active);

CREATE TABLE IF NOT EXISTS erp_financial_recurring_rule (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  recurrence TEXT NOT NULL DEFAULT 'MONTHLY',
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  category_id TEXT REFERENCES "ExpenseCategory"(id) ON DELETE SET NULL,
  supplier_id TEXT REFERENCES "Supplier"(id) ON DELETE SET NULL,
  contract_id TEXT REFERENCES "Contract"(id) ON DELETE SET NULL,
  cost_center TEXT,
  competence_prefix TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  next_due_date DATE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  default_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recurring_next_due ON erp_financial_recurring_rule(active, next_due_date);

CREATE TABLE IF NOT EXISTS erp_financial_attachment (
  id TEXT PRIMARY KEY,
  expense_id TEXT NOT NULL REFERENCES "Expense"(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT,
  original_name TEXT,
  uploaded_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_financial_attachment_expense ON erp_financial_attachment(expense_id);

CREATE TABLE IF NOT EXISTS erp_payroll_period (
  id TEXT PRIMARY KEY,
  competence TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  payment_date DATE,
  closed_at TIMESTAMPTZ,
  closed_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS erp_payroll_entry (
  id TEXT PRIMARY KEY,
  period_id TEXT NOT NULL REFERENCES erp_payroll_period(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL REFERENCES "Employee"(id) ON DELETE RESTRICT,
  base_salary NUMERIC(15,2) NOT NULL DEFAULT 0,
  overtime_50 NUMERIC(15,2) NOT NULL DEFAULT 0,
  overtime_100 NUMERIC(15,2) NOT NULL DEFAULT 0,
  benefits NUMERIC(15,2) NOT NULL DEFAULT 0,
  advances NUMERIC(15,2) NOT NULL DEFAULT 0,
  thirteenth_salary NUMERIC(15,2) NOT NULL DEFAULT 0,
  vacation_pay NUMERIC(15,2) NOT NULL DEFAULT 0,
  bonuses NUMERIC(15,2) NOT NULL DEFAULT 0,
  other_earnings NUMERIC(15,2) NOT NULL DEFAULT 0,
  inss NUMERIC(15,2) NOT NULL DEFAULT 0,
  irrf NUMERIC(15,2) NOT NULL DEFAULT 0,
  fgts NUMERIC(15,2) NOT NULL DEFAULT 0,
  other_deductions NUMERIC(15,2) NOT NULL DEFAULT 0,
  gross_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  company_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  paid_at TIMESTAMPTZ,
  receipt_path TEXT,
  events JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(period_id, employee_id)
);
CREATE INDEX IF NOT EXISTS idx_payroll_employee ON erp_payroll_entry(employee_id, period_id);

CREATE TABLE IF NOT EXISTS erp_contract_event (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL REFERENCES "Contract"(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  due_date DATE,
  amount NUMERIC(15,2),
  adjust_index TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  responsible TEXT,
  document_path TEXT,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contract_event_due ON erp_contract_event(contract_id, status, due_date);

CREATE TABLE IF NOT EXISTS erp_work_order (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  contract_id TEXT REFERENCES "Contract"(id) ON DELETE SET NULL,
  client_id TEXT REFERENCES "Client"(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  service_type TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  city TEXT,
  state CHAR(2),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'NORMAL',
  status TEXT NOT NULL DEFAULT 'OPEN',
  supervisor TEXT,
  required_epis JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_work_order_status ON erp_work_order(status, scheduled_start);
CREATE INDEX IF NOT EXISTS idx_work_order_contract ON erp_work_order(contract_id);

CREATE TABLE IF NOT EXISTS erp_work_order_employee (
  work_order_id TEXT NOT NULL REFERENCES erp_work_order(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL REFERENCES "Employee"(id) ON DELETE RESTRICT,
  role TEXT,
  checked_in_at TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ,
  PRIMARY KEY(work_order_id, employee_id)
);

CREATE TABLE IF NOT EXISTS erp_work_order_equipment (
  work_order_id TEXT NOT NULL REFERENCES erp_work_order(id) ON DELETE CASCADE,
  equipment_id TEXT NOT NULL REFERENCES "Equipment"(id) ON DELETE RESTRICT,
  released_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  notes TEXT,
  PRIMARY KEY(work_order_id, equipment_id)
);

CREATE TABLE IF NOT EXISTS erp_work_order_checklist (
  id TEXT PRIMARY KEY,
  work_order_id TEXT NOT NULL REFERENCES erp_work_order(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  item TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_by TEXT,
  completed_at TIMESTAMPTZ,
  evidence_path TEXT,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_work_order_checklist ON erp_work_order_checklist(work_order_id, completed);

CREATE TABLE IF NOT EXISTS erp_work_order_photo (
  id TEXT PRIMARY KEY,
  work_order_id TEXT NOT NULL REFERENCES erp_work_order(id) ON DELETE CASCADE,
  photo_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  caption TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by TEXT
);

CREATE TABLE IF NOT EXISTS erp_work_order_signature (
  id TEXT PRIMARY KEY,
  work_order_id TEXT NOT NULL REFERENCES erp_work_order(id) ON DELETE CASCADE,
  signer_type TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signer_document TEXT,
  signature_path TEXT NOT NULL,
  ip_address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consent_text TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS erp_document_extraction (
  id TEXT PRIMARY KEY,
  document_id TEXT,
  source_name TEXT,
  document_type TEXT,
  extracted_text TEXT,
  structured_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence NUMERIC(5,2),
  status TEXT NOT NULL DEFAULT 'PROCESSED',
  provider TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_document_extraction_type ON erp_document_extraction(document_type, created_at);
