-- ================================================================
--  MIGRACIÓN — Compras a meses sin intereses (MSI)
--  Ejecutar en Supabase SQL Editor.
--
--  Cada compra MSI guarda el total y el número de meses, pero el "corte"
--  de la tarjeta (useDesgloseCorteTarjeta) se calcula en vivo sumando
--  transacciones por fecha — así que NO se registra el monto_total como
--  una sola transacción. Se registra una transacción de gasto por cada
--  mensualidad (monto_mensual), fechada en proxima_fecha, igual que ya
--  se hace con suscripciones. Eso hace que cada corte solo "vea" una
--  mensualidad, no la compra completa.
-- ================================================================

CREATE TABLE IF NOT EXISTS compras_msi (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pareja_id       UUID NOT NULL REFERENCES parejas(id) ON DELETE CASCADE,
  tarjeta_id      UUID NOT NULL REFERENCES tarjetas(id) ON DELETE CASCADE,
  descripcion     TEXT NOT NULL,
  categoria       TEXT,
  persona         TEXT NOT NULL DEFAULT 'ambos' CHECK (persona IN ('p1','p2','ambos')),
  contexto        TEXT NOT NULL DEFAULT 'personal' CHECK (contexto IN ('personal','negocio')),
  monto_total     NUMERIC(14,2) NOT NULL CHECK (monto_total > 0),
  meses_total     INT NOT NULL CHECK (meses_total > 0),
  monto_mensual   NUMERIC(14,2) NOT NULL,
  meses_pagados   INT NOT NULL DEFAULT 0,
  fecha_compra    DATE NOT NULL,
  proxima_fecha   DATE NOT NULL,
  activa          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE compras_msi ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_compras_msi ON compras_msi FOR ALL USING (
  pareja_id IN (SELECT id FROM parejas WHERE user1_id = auth.uid() OR user2_id = auth.uid())
);

SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'compras_msi';
