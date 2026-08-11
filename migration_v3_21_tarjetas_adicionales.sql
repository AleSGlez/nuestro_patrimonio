-- migration_v3_21_tarjetas_adicionales.sql
-- Tarjetas adicionales (2026-08-11). Correr en Supabase SQL Editor.

-- Cuando una tarjeta es 'Compartida' (persona='ambos'), titular_principal indica
-- quién es el titular original ('p1'/'p2') — el otro se muestra como adicional.
-- Es solo informativo para la UI (TarjetaCard, FormTransaccion, FormAccesoRapido):
-- el desglose del corte por persona ya se calcula por transacción (columna
-- transacciones.persona), no por quién es el titular de la tarjeta física.
ALTER TABLE tarjetas
  ADD COLUMN IF NOT EXISTS titular_principal TEXT;

-- Límite personalizado de la tarjeta adicional (opcional). La deuda, el saldo
-- y el límite total de crédito siguen siendo compartidos entre titular y
-- adicional — esto es solo un tope informativo que algunos bancos permiten
-- configurar por adicional, no crea una segunda línea de crédito.
ALTER TABLE tarjetas
  ADD COLUMN IF NOT EXISTS limite_adicional NUMERIC(14,2);
