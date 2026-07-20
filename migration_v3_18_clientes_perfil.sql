-- ================================================================
--  MIGRACIÓN — Fase 17: Perfil extendido de clientes
--  Nivel de cliente, envíos y dirección. Todas las columnas son
--  ADD COLUMN IF NOT EXISTS con default seguro — los clientes
--  existentes no pierden información, solo ganan estos campos
--  con su valor por defecto.
-- ================================================================

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nivel TEXT NOT NULL DEFAULT 'nuevo'
  CHECK (nivel IN ('nuevo','normal','vip'));

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS hace_envios BOOLEAN NOT NULL DEFAULT false;

-- Dirección estructurada (para envíos futuros) — todo opcional
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS direccion_calle   TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS direccion_numero  TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS direccion_colonia TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS direccion_ciudad  TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS direccion_estado  TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS direccion_cp      TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS direccion_pais    TEXT DEFAULT 'México';

SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'clientes'
  AND column_name IN ('nivel','hace_envios','direccion_calle','direccion_numero',
    'direccion_colonia','direccion_ciudad','direccion_estado','direccion_cp','direccion_pais');
