-- ================================================================
--  MIGRACIÓN — Presupuesto de negocio
--  Agrega columna contexto a presupuestos existentes
-- ================================================================
ALTER TABLE presupuestos ADD COLUMN IF NOT EXISTS contexto TEXT NOT NULL DEFAULT 'personal'
  CHECK (contexto IN ('personal','negocio'));

-- Verificar
SELECT column_name FROM information_schema.columns
WHERE table_name = 'presupuestos' AND column_name = 'contexto';
