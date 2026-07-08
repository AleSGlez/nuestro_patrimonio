-- ================================================================
--  MIGRACIÓN — Suscripciones y transacciones recurrentes
--  Ejecutar en Supabase SQL Editor.
-- ================================================================

CREATE TABLE IF NOT EXISTS suscripciones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pareja_id       UUID NOT NULL REFERENCES parejas(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  emoji           TEXT NOT NULL DEFAULT '🔄',
  monto           NUMERIC(14,2) NOT NULL,
  moneda          TEXT NOT NULL DEFAULT 'MXN',
  frecuencia      TEXT NOT NULL CHECK (frecuencia IN ('diaria','semanal','mensual','bimestral','trimestral','semestral','anual')),
  dia_cobro       INT,           -- día del mes en que se cobra (1-31)
  proxima_fecha   DATE NOT NULL,
  ultima_fecha    DATE,
  categoria       TEXT,
  persona         TEXT NOT NULL DEFAULT 'ambos' CHECK (persona IN ('p1','p2','ambos')),
  metodo_pago_id  UUID,          -- cuenta_id o tarjeta_id
  metodo_tipo     TEXT CHECK (metodo_tipo IN ('cuenta','tarjeta')),
  contexto        TEXT NOT NULL DEFAULT 'personal' CHECK (contexto IN ('personal','negocio')),
  activa          BOOLEAN NOT NULL DEFAULT TRUE,
  auto_registrar  BOOLEAN NOT NULL DEFAULT FALSE, -- si true, crea tx automáticamente al vencer
  nota            TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE suscripciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_suscripciones ON suscripciones FOR ALL USING (
  pareja_id IN (SELECT id FROM parejas WHERE user1_id = auth.uid() OR user2_id = auth.uid())
);

SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'suscripciones';
