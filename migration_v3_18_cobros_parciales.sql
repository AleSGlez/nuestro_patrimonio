-- ================================================================
--  MIGRACIÓN — Cobros: pagos parciales ligados a un cargo específico
--  + pagos con destino a un apartado de negocio.
--  Ejecutar en Supabase SQL Editor.
-- ================================================================

-- Cuánto le queda pendiente a UN cargo específico. Solo se llena en
-- filas tipo='cargo' (al crearse = monto, se reduce con cada pago
-- ligado vía cargo_id). NULL = cargo histórico sin desglose por pago
-- (creado antes de esta migración) — sigue funcionando solo a través
-- del saldo agregado clientes.saldo_pendiente, como hasta ahora.
ALTER TABLE clientes_movimientos ADD COLUMN IF NOT EXISTS saldo_restante NUMERIC(14,2);

-- A qué cargo específico aplica un pago (solo en filas tipo='pago').
-- Permite "cliente debe por 2 cosas, paga la cosa 1, la cosa 2 sigue
-- pendiente". ON DELETE SET NULL: si se borra el cargo, el pago no
-- se cae, solo pierde la referencia.
ALTER TABLE clientes_movimientos ADD COLUMN IF NOT EXISTS cargo_id UUID REFERENCES clientes_movimientos(id) ON DELETE SET NULL;

-- Fuerza a PostgREST a refrescar su caché de schema.
NOTIFY pgrst, 'reload schema';

-- ================================================================
--  Verificación
-- ================================================================
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'clientes_movimientos'
  AND column_name IN ('saldo_restante', 'cargo_id');
