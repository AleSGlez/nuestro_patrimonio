-- ================================================================
--  MIGRACIÓN — Fase 15: Accesos Rápidos (botones de un toque)
-- ================================================================

CREATE TABLE IF NOT EXISTS accesos_rapidos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pareja_id       UUID NOT NULL REFERENCES parejas(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  emoji           TEXT NOT NULL DEFAULT '⚡',
  tipo            TEXT NOT NULL DEFAULT 'gasto' CHECK (tipo IN ('gasto','ingreso')),
  monto_default   NUMERIC(14,2) NOT NULL,
  categoria       TEXT NOT NULL,
  responsable     TEXT NOT NULL CHECK (responsable IN ('p1','p2','negocio')),
  metodo_pago     TEXT NOT NULL,              -- "cuenta:UUID" | "tarjeta:UUID"
  confirmar_monto BOOLEAN NOT NULL DEFAULT FALSE,
  favorito        BOOLEAN NOT NULL DEFAULT FALSE,
  orden           INTEGER NOT NULL DEFAULT 0,
  ultimo_uso      DATE,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE transacciones ADD COLUMN IF NOT EXISTS acceso_rapido_id UUID
  REFERENCES accesos_rapidos(id) ON DELETE SET NULL;

ALTER TABLE accesos_rapidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_accesos_rapidos ON accesos_rapidos FOR ALL USING (
  pareja_id IN (SELECT id FROM parejas WHERE user1_id = auth.uid() OR user2_id = auth.uid())
);

SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('accesos_rapidos');
