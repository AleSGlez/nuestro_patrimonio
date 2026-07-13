-- ================================================================
--  MIGRACIÓN — disponible_para_venta en productos
-- ================================================================

-- La columna 'estado' ya existe con valores: 'en_transito','disponible','vendido','apartado'
-- Solo necesitamos asegurar que existe y tiene el valor correcto
ALTER TABLE productos ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'disponible'
  CHECK (estado IN ('en_transito','disponible','vendido','apartado'));

-- Renombrar categoría en transacciones existentes
UPDATE transacciones SET categoria = 'inventario' WHERE categoria = 'compra_producto';

-- Verificar
SELECT estado, COUNT(*) FROM productos GROUP BY estado;
