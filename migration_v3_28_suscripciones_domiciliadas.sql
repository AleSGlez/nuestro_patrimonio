-- ================================================================
--  MIGRACIÓN INCREMENTAL — Suscripciones domiciliadas
--  Ejecutar en Supabase SQL Editor.
--
--  domiciliada = el cargo se cobra solo a la cuenta/tarjeta; la app lo
--  registra automáticamente al abrirse cuando llega la fecha.
-- ================================================================

ALTER TABLE suscripciones ADD COLUMN IF NOT EXISTS domiciliada BOOLEAN NOT NULL DEFAULT false;

-- ================================================================
--  Verificación
-- ================================================================
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'suscripciones' AND column_name = 'domiciliada';
