-- ================================================================
--  MIGRACIÓN — Transacciones recurrentes + mejoras suscripciones
-- ================================================================

-- Columnas faltantes en suscripciones para método de pago
ALTER TABLE suscripciones ADD COLUMN IF NOT EXISTS cuenta_id UUID REFERENCES cuentas(id);
ALTER TABLE suscripciones ADD COLUMN IF NOT EXISTS tarjeta_id UUID REFERENCES tarjetas(id);

-- Transacciones recurrentes (renta, nómina, abono a deuda, etc.)
CREATE TABLE IF NOT EXISTS transacciones_recurrentes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pareja_id     UUID NOT NULL REFERENCES parejas(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  emoji         TEXT NOT NULL DEFAULT '🔄',
  tipo          TEXT NOT NULL CHECK (tipo IN ('gasto','ingreso')),
  monto         NUMERIC(14,2) NOT NULL,
  categoria     TEXT,
  frecuencia    TEXT NOT NULL CHECK (frecuencia IN ('diaria','semanal','mensual','bimestral','trimestral','semestral','anual')),
  proxima_fecha DATE NOT NULL,
  persona       TEXT NOT NULL DEFAULT 'ambos' CHECK (persona IN ('p1','p2','ambos')),
  contexto      TEXT NOT NULL DEFAULT 'personal' CHECK (contexto IN ('personal','negocio')),
  cuenta_id     UUID REFERENCES cuentas(id),
  tarjeta_id    UUID REFERENCES tarjetas(id),
  activa        BOOLEAN NOT NULL DEFAULT TRUE,
  nota          TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE transacciones_recurrentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_tx_recurrentes ON transacciones_recurrentes FOR ALL USING (
  pareja_id IN (SELECT id FROM parejas WHERE user1_id = auth.uid() OR user2_id = auth.uid())
);

SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('transacciones_recurrentes');
