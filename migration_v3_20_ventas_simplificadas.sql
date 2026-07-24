-- ================================================================
--  MIGRACIÓN v3.20 — Ventas simplificadas (sin depender de Inventario)
-- ================================================================
-- ventas_items.producto_id era NOT NULL (migration_v3_11_ventas.sql) porque
-- toda venta requería una carta ya cargada en Inventario. El control de
-- inventario se va a llevar en Collectr, así que una venta ahora puede
-- registrarse escribiendo manualmente qué se vendió, sin producto real
-- detrás -- la referencia a producto pasa a ser opcional, y se agrega una
-- descripción de texto libre para esas líneas sin producto.

ALTER TABLE ventas_items ALTER COLUMN producto_id DROP NOT NULL;
ALTER TABLE ventas_items ADD COLUMN IF NOT EXISTS descripcion TEXT;
