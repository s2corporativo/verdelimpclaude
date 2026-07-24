-- Verdelimp v3.5 — planos de logística persistentes e auditáveis.
-- Migration aditiva: não altera nem remove ordens de serviço existentes.

CREATE TABLE IF NOT EXISTS erp_logistics_plan (
  id TEXT PRIMARY KEY,
  week_start DATE NOT NULL,
  criteria TEXT NOT NULL DEFAULT 'balanceado',
  status TEXT NOT NULL DEFAULT 'DRAFT',
  work_order_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  plan JSONB NOT NULL,
  generated_by TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logistics_plan_week
  ON erp_logistics_plan(week_start DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_logistics_plan_status
  ON erp_logistics_plan(status, week_start DESC);
