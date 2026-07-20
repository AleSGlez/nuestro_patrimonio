-- ================================================================
--  MIGRACIÓN INCREMENTAL — Fix migration_v3_17_clientes_cobros
--  Re-aplica de forma idempotente lo que no haya quedado bien la
--  primera vez (columnas en clientes + constraint de tipo).
--  Ejecutar en Supabase SQL Editor.
-- ================================================================

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS saldo_pendiente NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS adeudo_desde DATE;

ALTER TABLE clientes_movimientos
  DROP CONSTRAINT IF EXISTS clientes_movimientos_tipo_check;

ALTER TABLE clientes_movimientos
  ADD CONSTRAINT clientes_movimientos_tipo_check
  CHECK (tipo IN ('cargo','pago'));

-- Fuerza a PostgREST a refrescar su caché de schema — evita el error
-- "Could not find the 'X' column ... in the schema cache" justo después
-- de un ALTER TABLE.
NOTIFY pgrst, 'reload schema';

-- ================================================================
--  Verificación
-- ================================================================
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'clientes'
  AND column_name IN ('saldo_pendiente','adeudo_desde');

SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'clientes_movimientos'::regclass AND contype = 'c';
