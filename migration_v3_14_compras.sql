-- ================================================================
--  MIGRACIÓN — Fase 14: Compras + estado de lotes
-- ================================================================

-- Agregar estado a productos para tracking
ALTER TABLE productos ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'disponible'
  CHECK (estado IN ('en_transito','disponible','vendido','apartado'));

-- Agregar estado a lotes_compra para tracking del pedido Buyee
ALTER TABLE lotes_compra ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'recibido'
  CHECK (estado IN ('pagado','en_almacen_buyee','enviado_mexico','en_aduana','recibido'));

ALTER TABLE lotes_compra ADD COLUMN IF NOT EXISTS cuenta_id UUID REFERENCES cuentas(id);
ALTER TABLE lotes_compra ADD COLUMN IF NOT EXISTS metodo_pago TEXT;
ALTER TABLE lotes_compra ADD COLUMN IF NOT EXISTS fecha_estimada DATE;
ALTER TABLE lotes_compra ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'buyee'
  CHECK (tipo IN ('buyee','individual','otro'));

-- Transacción vinculada al lote
ALTER TABLE lotes_compra ADD COLUMN IF NOT EXISTS transaccion_id UUID;

-- Verificar
SELECT column_name FROM information_schema.columns
WHERE table_name IN ('lotes_compra','productos')
  AND column_name IN ('estado','cuenta_id','metodo_pago','tipo','fecha_estimada','transaccion_id')
ORDER BY table_name, column_name;
