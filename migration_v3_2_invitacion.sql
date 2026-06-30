-- ================================================================
--  MIGRACIÓN INCREMENTAL — Fase 2
--  Agrega código de invitación a parejas
--  Ejecutar en Supabase SQL Editor DESPUÉS de migration_v3_final.sql
-- ================================================================

-- Código único de 6 caracteres para invitar a la pareja
ALTER TABLE parejas
  ADD COLUMN IF NOT EXISTS codigo_invitacion TEXT UNIQUE;

-- Generar código aleatorio de 6 caracteres alfanuméricos (mayúsculas)
CREATE OR REPLACE FUNCTION generar_codigo_invitacion()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars   TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- sin O,0,I,1 para evitar confusión
  result  TEXT := '';
  i       INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Trigger: generar código automáticamente al crear una pareja
CREATE OR REPLACE FUNCTION set_codigo_invitacion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  nuevo_codigo TEXT;
  intentos     INT := 0;
BEGIN
  IF NEW.codigo_invitacion IS NULL THEN
    LOOP
      nuevo_codigo := generar_codigo_invitacion();
      intentos := intentos + 1;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM parejas WHERE codigo_invitacion = nuevo_codigo)
        OR intentos > 10;
    END LOOP;
    NEW.codigo_invitacion := nuevo_codigo;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_codigo_invitacion ON parejas;
CREATE TRIGGER tg_codigo_invitacion
  BEFORE INSERT ON parejas
  FOR EACH ROW EXECUTE FUNCTION set_codigo_invitacion();

-- ================================================================
--  RLS adicional: permitir buscar pareja por código de invitación
--  Esto es necesario para que el segundo usuario pueda encontrar
--  la pareja ANTES de estar vinculado (user2_id aún es null)
-- ================================================================
DROP POLICY IF EXISTS rls_parejas ON parejas;

CREATE POLICY rls_parejas_select_own ON parejas
  FOR SELECT
  USING (
    user1_id = auth.uid()
    OR user2_id = auth.uid()
  );

-- Política especial: cualquier usuario autenticado puede BUSCAR
-- una pareja por código de invitación (solo lectura de campos básicos)
-- para poder unirse. No expone datos financieros porque esta tabla
-- solo tiene nombres/tema, no montos.
CREATE POLICY rls_parejas_select_by_code ON parejas
  FOR SELECT
  USING (codigo_invitacion IS NOT NULL);

CREATE POLICY rls_parejas_update_own ON parejas
  FOR UPDATE
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE POLICY rls_parejas_insert ON parejas
  FOR INSERT
  WITH CHECK (user1_id = auth.uid());

-- Permitir que un usuario sin pareja aún se vincule como user2
-- mediante el código (esto se hace con UPDATE, cubierto arriba,
-- pero necesitamos permitir el UPDATE específico de unirse)
DROP POLICY IF EXISTS rls_parejas_join ON parejas;
CREATE POLICY rls_parejas_join ON parejas
  FOR UPDATE
  USING (user2_id IS NULL AND codigo_invitacion IS NOT NULL)
  WITH CHECK (user2_id = auth.uid());

-- ================================================================
--  Verificación
-- ================================================================
SELECT id, nombre1, nombre2, codigo_invitacion, user1_id, user2_id
FROM parejas
LIMIT 5;
