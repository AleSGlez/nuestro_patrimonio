-- ================================================================
--  MIGRACIÓN INCREMENTAL — Presupuestos con etiquetas de categoría
--  Ejecutar en Supabase SQL Editor.
--
--  categorias = categorías de gasto (CAT_GASTO) que cuentan contra el
--  presupuesto. NULL o vacío = cuentan todos los gastos (comportamiento
--  anterior, para los presupuestos que ya existen).
-- ================================================================

ALTER TABLE presupuestos ADD COLUMN IF NOT EXISTS categorias TEXT[];

-- ================================================================
--  Verificación
-- ================================================================
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'presupuestos' AND column_name = 'categorias';
