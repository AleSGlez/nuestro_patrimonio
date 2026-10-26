-- ================================================================
--  MIGRACIÓN — Color de acento personalizado
--  Ejecutar en Supabase SQL Editor.
--
--  Hasta ahora `tema` nunca se escribía de vuelta a la base de datos
--  (solo vivía en localStorage) — cada recarga de página lo pisaba con
--  el valor con el que se creó la pareja. Aprovechando que se agrega
--  accent_hex, también se arregla eso: MasPage ahora sí guarda tema +
--  accent_hex en `parejas`.
-- ================================================================

ALTER TABLE parejas ADD COLUMN IF NOT EXISTS accent_hex TEXT;

SELECT column_name FROM information_schema.columns
WHERE table_name = 'parejas' AND column_name = 'accent_hex';
