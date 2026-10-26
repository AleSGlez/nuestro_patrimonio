-- ================================================================
--  MIGRACIÓN — Notificaciones push (web push nativo)
--  Ejecutar en Supabase SQL Editor.
--
--  Cada dispositivo que activa notificaciones guarda aquí su suscripción
--  push (endpoint + llaves de cifrado que entrega el navegador). La Edge
--  Function `enviar-notificaciones` lee estas filas y manda los avisos
--  con la llave VAPID privada (nunca viaja al frontend).
--
--  Una persona puede tener varios dispositivos (iPhone + compu) → varias
--  filas con el mismo pareja_id/user_id. endpoint es único por dispositivo.
-- ================================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pareja_id   UUID NOT NULL REFERENCES parejas(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  user_agent  TEXT,
  activa      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  last_sent_at TIMESTAMPTZ
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_push_subscriptions ON push_subscriptions FOR ALL USING (
  pareja_id IN (SELECT id FROM parejas WHERE user1_id = auth.uid() OR user2_id = auth.uid())
);

-- La Edge Function usa la service_role key (bypassa RLS) para leer todas las
-- suscripciones de todas las parejas y mandar los avisos diarios — no necesita
-- policy adicional.

-- Evita duplicar el mismo aviso el mismo día en el mismo dispositivo
-- (ej. "corte en 3 días" no debe llegar dos veces si el cron corre de más).
CREATE TABLE IF NOT EXISTS push_enviados (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES push_subscriptions(id) ON DELETE CASCADE,
  clave         TEXT NOT NULL,     -- ej: "tarjeta:UUID:limite:2026-10-27"
  fecha         DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (subscription_id, clave, fecha)
);

ALTER TABLE push_enviados ENABLE ROW LEVEL SECURITY;
-- Solo la Edge Function (service_role) lee/escribe esta tabla de control.
CREATE POLICY rls_push_enviados_none ON push_enviados FOR ALL USING (false);

SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('push_subscriptions', 'push_enviados');
