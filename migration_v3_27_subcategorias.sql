-- ================================================================
--  MIGRACIÓN INCREMENTAL — Subcategorías de gasto/ingreso
--  Ejecutar en Supabase SQL Editor.
--
--  Las subcategorías sugeridas (Gasolina, Estacionamiento, Súper…) viven
--  en el código; esta tabla guarda solo las que la pareja agrega.
--  transacciones.subcategoria = nombre de la subcategoría (NULL = sin).
--  presupuestos.categorias puede incluir 'categoria' (toda) o
--  'categoria:Subcategoría' (solo esa subcategoría).
-- ================================================================

CREATE TABLE IF NOT EXISTS subcategorias (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pareja_id  UUID NOT NULL REFERENCES parejas(id) ON DELETE CASCADE,
  categoria  TEXT NOT NULL,
  nombre     TEXT NOT NULL,
  activa     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pareja_id, categoria, nombre)
);

ALTER TABLE subcategorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_subcategorias ON subcategorias;
CREATE POLICY rls_subcategorias ON subcategorias FOR ALL USING (
  pareja_id IN (SELECT id FROM parejas WHERE user1_id = auth.uid() OR user2_id = auth.uid())
);

ALTER TABLE transacciones ADD COLUMN IF NOT EXISTS subcategoria TEXT;

-- ================================================================
--  Verificación
-- ================================================================
SELECT table_name FROM information_schema.tables WHERE table_name = 'subcategorias';
SELECT column_name FROM information_schema.columns
WHERE table_name = 'transacciones' AND column_name = 'subcategoria';
