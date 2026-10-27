-- ================================================================
--  MIGRACIÓN INCREMENTAL — Quién aporta a cada meta
--  Ejecutar en Supabase SQL Editor.
--
--  persona = 'p1' | 'p2' | 'ambos'. Las aportaciones viejas quedan en NULL
--  y en la app se muestran con la persona de su meta.
-- ================================================================

ALTER TABLE metas_aportaciones ADD COLUMN IF NOT EXISTS persona TEXT;

-- ================================================================
--  Verificación
-- ================================================================
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'metas_aportaciones' AND column_name = 'persona';
