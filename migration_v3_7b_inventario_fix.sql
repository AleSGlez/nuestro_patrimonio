-- ================================================================
--  MIGRACIÓN — Si ya tienes las tablas pero con columnas faltantes
--  Ejecuta esto SOLO si al correr migration_v3_7_inventario.sql
--  recibes errores de "table already exists"
-- ================================================================

-- Agrega columnas faltantes a proveedores si ya existe la tabla
ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS nota TEXT;
ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS plataforma TEXT NOT NULL DEFAULT 'Buyee';

-- Agrega columnas faltantes a productos si ya existe la tabla
ALTER TABLE productos ADD COLUMN IF NOT EXISTS nombre_jp TEXT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS nombre_en TEXT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS serie TEXT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS numero_carta TEXT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS idioma TEXT NOT NULL DEFAULT 'JP';
ALTER TABLE productos ADD COLUMN IF NOT EXISTS condicion TEXT DEFAULT 'mint';
ALTER TABLE productos ADD COLUMN IF NOT EXISTS cantidad_compra INT NOT NULL DEFAULT 1;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS cantidad_stock INT NOT NULL DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_unitario_compra NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_venta NUMERIC(14,2);
ALTER TABLE productos ADD COLUMN IF NOT EXISTS costo_extra_prorrateado NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagen_url TEXT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

-- Verifica
SELECT 'proveedores' as tabla, column_name FROM information_schema.columns WHERE table_name = 'proveedores'
UNION ALL
SELECT 'productos', column_name FROM information_schema.columns WHERE table_name = 'productos'
ORDER BY tabla, column_name;
