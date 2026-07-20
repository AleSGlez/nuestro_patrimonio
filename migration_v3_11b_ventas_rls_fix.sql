-- ================================================================
--  MIGRACIÓN INCREMENTAL — Fix RLS faltante en clientes/ventas/ventas_items
--  RLS está ENABLED en estas tablas pero sin ninguna policy — eso bloquea
--  TODO acceso (insert incluido), no solo casos que "no cumplen" la regla.
--  Se recrean las policies explícitamente, sin importar si ya existían.
--  Ejecutar en Supabase SQL Editor.
-- ================================================================

DROP POLICY IF EXISTS rls_clientes ON clientes;
CREATE POLICY rls_clientes ON clientes FOR ALL USING (
  pareja_id IN (SELECT id FROM parejas WHERE user1_id = auth.uid() OR user2_id = auth.uid())
);

DROP POLICY IF EXISTS rls_ventas ON ventas;
CREATE POLICY rls_ventas ON ventas FOR ALL USING (
  pareja_id IN (SELECT id FROM parejas WHERE user1_id = auth.uid() OR user2_id = auth.uid())
);

DROP POLICY IF EXISTS rls_ventas_items ON ventas_items;
CREATE POLICY rls_ventas_items ON ventas_items FOR ALL USING (
  venta_id IN (
    SELECT id FROM ventas WHERE pareja_id IN (
      SELECT id FROM parejas WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  )
);

NOTIFY pgrst, 'reload schema';

-- ================================================================
--  Verificación — debe mostrar exactamente 3 filas (una por tabla)
-- ================================================================
SELECT tablename, policyname
FROM pg_policies
WHERE tablename IN ('clientes','ventas','ventas_items');
