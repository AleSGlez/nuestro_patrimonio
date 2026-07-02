-- ================================================================
--  MIGRACIÓN INCREMENTAL — Fase 7: Presupuestos con roll-over
--  Ejecutar en Supabase SQL Editor.
-- ================================================================

CREATE TABLE IF NOT EXISTS presupuestos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pareja_id     UUID NOT NULL REFERENCES parejas(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  emoji         TEXT NOT NULL DEFAULT '💰',
  tipo          TEXT NOT NULL CHECK (tipo IN ('diario','semanal','mensual')),
  monto_base    NUMERIC(14,2) NOT NULL,  -- presupuesto base por período
  persona       TEXT NOT NULL DEFAULT 'ambos' CHECK (persona IN ('p1','p2','ambos')),
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_inicio  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE presupuestos ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_presupuestos ON presupuestos
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
WHERE table_schema = 'public' AND table_name = 'presupuestos';
