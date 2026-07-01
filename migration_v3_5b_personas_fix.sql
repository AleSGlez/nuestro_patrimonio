-- ================================================================
--  MIGRACIÓN INCREMENTAL — Fix tipos personas_movimientos
--  Reemplaza 'cobro' por 'le_debo' en el CHECK constraint.
--  Ejecutar en Supabase SQL Editor.
-- ================================================================

ALTER TABLE personas_movimientos
  DROP CONSTRAINT IF EXISTS personas_movimientos_tipo_check;

ALTER TABLE personas_movimientos
  ADD CONSTRAINT personas_movimientos_tipo_check
  CHECK (tipo IN ('prestamo','le_debo','pago_recibido','pago_enviado'));

-- ================================================================
--  Verificación
-- ================================================================
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'personas_movimientos'::regclass AND contype = 'c';
