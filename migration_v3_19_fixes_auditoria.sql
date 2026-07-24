-- migration_v3_19_fixes_auditoria.sql
-- Fixes de la auditoría de procesos (2026-07-23). Correr en Supabase SQL Editor.

-- 1. Pagos/transferencias cuyo origen es un APARTADO (no la cuenta):
--    usePagarTarjeta y useTransferirPersonalNegocio guardan aquí el apartado
--    origen, y useEliminarTransferencia devuelve el dinero al apartado (no a la
--    cuenta) al revertir. Antes el origen apartado no se registraba y además el
--    monto se descontaba doble (apartado + cuenta).
ALTER TABLE transferencias
  ADD COLUMN IF NOT EXISTS origen_apartado_id UUID REFERENCES cuenta_apartados(id) ON DELETE SET NULL;

-- 2. Aportaciones a metas ligadas a su transacción de gasto:
--    permite eliminar una aportación revirtiendo la meta, el saldo de la cuenta
--    y borrando la transacción vinculada (useEliminarAportacion en useMetas.js).
ALTER TABLE metas_aportaciones
  ADD COLUMN IF NOT EXISTS transaccion_id UUID;
