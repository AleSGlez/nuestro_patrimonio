-- ================================================================
--  MIGRACIÓN — Fase 11: Metas de ahorro
-- ================================================================

CREATE TABLE IF NOT EXISTS metas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pareja_id     UUID NOT NULL REFERENCES parejas(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  emoji         TEXT NOT NULL DEFAULT '🎯',
  descripcion   TEXT,
  monto_objetivo NUMERIC(14,2) NOT NULL,
  monto_actual  NUMERIC(14,2) NOT NULL DEFAULT 0,
  fecha_objetivo DATE,
  persona       TEXT NOT NULL DEFAULT 'ambos' CHECK (persona IN ('p1','p2','ambos')),
  -- Opcional: vincular a un apartado real
  apartado_id   UUID,
  cuenta_id     UUID REFERENCES cuentas(id),  -- cuenta de donde salen las aportaciones
  color         TEXT DEFAULT '#7C6EFA',
  activa        BOOLEAN NOT NULL DEFAULT TRUE,
  completada    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS metas_aportaciones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_id     UUID NOT NULL REFERENCES metas(id) ON DELETE CASCADE,
  pareja_id   UUID NOT NULL REFERENCES parejas(id) ON DELETE CASCADE,
  monto       NUMERIC(14,2) NOT NULL,
  fecha       DATE NOT NULL DEFAULT CURRENT_DATE,
  nota        TEXT,
  cuenta_id   UUID REFERENCES cuentas(id),  -- cuenta de donde salió
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE metas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas_aportaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_metas ON metas FOR ALL USING (
  pareja_id IN (SELECT id FROM parejas WHERE user1_id = auth.uid() OR user2_id = auth.uid())
);
CREATE POLICY rls_metas_aportaciones ON metas_aportaciones FOR ALL USING (
  pareja_id IN (SELECT id FROM parejas WHERE user1_id = auth.uid() OR user2_id = auth.uid())
);

SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('metas','metas_aportaciones');
