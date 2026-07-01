-- ================================================================
--  MIGRACIÓN INCREMENTAL — Módulo Personas (Fase 4.5)
--  Terceros con seguimiento de deuda (quién te debe, a quién le debes)
--  Ejecutar en Supabase SQL Editor.
-- ================================================================

CREATE TABLE IF NOT EXISTS personas_externas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pareja_id     UUID NOT NULL REFERENCES parejas(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  emoji         TEXT NOT NULL DEFAULT '👤',
  telefono      TEXT,
  nota          TEXT,
  -- saldo: positivo = te debe, negativo = le debes
  saldo         NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS personas_movimientos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pareja_id       UUID NOT NULL REFERENCES parejas(id) ON DELETE CASCADE,
  persona_id      UUID NOT NULL REFERENCES personas_externas(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL CHECK (tipo IN ('prestamo','cobro','pago_recibido','pago_enviado')),
  -- prestamo:      yo le presté → saldo sube (me debe más)
  -- cobro:         me debe por algo → saldo sube
  -- pago_recibido: me pagó → saldo baja
  -- pago_enviado:  yo le pagué → saldo baja
  monto           NUMERIC(14,2) NOT NULL,
  descripcion     TEXT,
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  cuenta_id       UUID REFERENCES cuentas(id),   -- cuenta afectada (opcional)
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE personas_externas ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas_movimientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_personas_externas ON personas_externas
  FOR ALL USING (
    pareja_id IN (
      SELECT id FROM parejas
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

CREATE POLICY rls_personas_movimientos ON personas_movimientos
  FOR ALL USING (
    pareja_id IN (
      SELECT id FROM parejas
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- ================================================================
--  Verificación
-- ================================================================
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('personas_externas','personas_movimientos');
