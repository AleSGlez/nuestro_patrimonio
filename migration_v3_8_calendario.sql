-- ================================================================
--  MIGRACIÓN INCREMENTAL — Calendario
--  Ejecutar en Supabase SQL Editor.
-- ================================================================

CREATE TABLE IF NOT EXISTS calendario_eventos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pareja_id   UUID NOT NULL REFERENCES parejas(id) ON DELETE CASCADE,
  titulo      TEXT NOT NULL,
  fecha       DATE NOT NULL,
  tipo        TEXT NOT NULL CHECK (tipo IN ('quincena','corte_tarjeta','pago_tarjeta','manual')),
  referencia_id UUID,   -- tarjeta_id u otro
  color       TEXT,
  nota        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE calendario_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_calendario ON calendario_eventos FOR ALL USING (
  pareja_id IN (SELECT id FROM parejas WHERE user1_id = auth.uid() OR user2_id = auth.uid())
);

SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'calendario_eventos';
