-- ================================================================
--  MIGRACIÓN — Fase 16: Clientes que deben (Cuentas por cobrar)
-- ================================================================

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS saldo_pendiente NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS adeudo_desde DATE;

CREATE TABLE IF NOT EXISTS clientes_movimientos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pareja_id      UUID NOT NULL REFERENCES parejas(id) ON DELETE CASCADE,
  cliente_id     UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo           TEXT NOT NULL CHECK (tipo IN ('cargo','pago')),
  -- cargo: se registra un adeudo (saldo sube)
  -- pago:  se recibe un pago, parcial o total (saldo baja)
  monto          NUMERIC(14,2) NOT NULL,
  descripcion    TEXT,
  fecha          DATE NOT NULL DEFAULT CURRENT_DATE,
  venta_id       UUID REFERENCES ventas(id),    -- opcional, contexto de la venta relacionada
  cuenta_id      UUID REFERENCES cuentas(id),   -- solo en 'pago' — cuenta donde entró el dinero
  transaccion_id UUID,                          -- tx de ingreso vinculada (solo 'pago')
  created_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE clientes_movimientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_clientes_movimientos ON clientes_movimientos FOR ALL USING (
  pareja_id IN (SELECT id FROM parejas WHERE user1_id = auth.uid() OR user2_id = auth.uid())
);

SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('clientes_movimientos');
