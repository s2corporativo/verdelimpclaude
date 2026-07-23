CREATE TABLE IF NOT EXISTS erp_epi_return (
  id TEXT PRIMARY KEY,
  delivery_id TEXT NOT NULL REFERENCES "InventoryEpiDelivery"(id) ON DELETE CASCADE,
  return_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  condition TEXT NOT NULL DEFAULT 'USED',
  restocked BOOLEAN NOT NULL DEFAULT FALSE,
  reason TEXT,
  signature_path TEXT,
  received_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_epi_return_delivery ON erp_epi_return(delivery_id, return_date);
