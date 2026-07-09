-- ================================================================
--  MIGRACIÓN — Ventas + Clientes
-- ================================================================

-- Clientes
CREATE TABLE IF NOT EXISTS clientes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pareja_id   UUID NOT NULL REFERENCES parejas(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  telefono    TEXT,
  email       TEXT,
  instagram   TEXT,
  nota        TEXT,
  -- Lista de cartas que colecciona / pedidos especiales
  wishlist    TEXT,  -- texto libre por ahora
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Ventas (cabecera)
CREATE TABLE IF NOT EXISTS ventas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pareja_id     UUID NOT NULL REFERENCES parejas(id) ON DELETE CASCADE,
  cliente_id    UUID REFERENCES clientes(id),
  fecha         DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Totales calculados al guardar
  total_venta   NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_costo   NUMERIC(14,2) NOT NULL DEFAULT 0,
  ganancia      NUMERIC(14,2) NOT NULL DEFAULT 0,
  -- Método de cobro y cuenta destino
  metodo_cobro  TEXT NOT NULL DEFAULT 'efectivo'
    CHECK (metodo_cobro IN ('efectivo','transferencia','mercadolibre','paypal','otro')),
  cuenta_id     UUID REFERENCES cuentas(id),
  -- Comisión de plataforma (ML, PayPal cobran %)
  comision_pct  NUMERIC(5,2) NOT NULL DEFAULT 0,
  comision_monto NUMERIC(14,2) NOT NULL DEFAULT 0,
  nota          TEXT,
  -- Referencia a la transacción de ingreso creada automáticamente
  transaccion_id UUID,
  estado        TEXT NOT NULL DEFAULT 'completada'
    CHECK (estado IN ('completada','cancelada','pendiente')),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Líneas de venta (una por carta vendida)
CREATE TABLE IF NOT EXISTS ventas_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id      UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id   UUID NOT NULL REFERENCES productos(id),
  cantidad      INT NOT NULL DEFAULT 1,
  precio_venta  NUMERIC(14,2) NOT NULL,  -- precio por unidad en esta venta
  costo_unitario NUMERIC(14,2) NOT NULL, -- precio_compra + prorrateado al momento de vender
  subtotal      NUMERIC(14,2) NOT NULL,
  ganancia_item NUMERIC(14,2) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE clientes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas_items  ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_clientes     ON clientes     FOR ALL USING (pareja_id IN (SELECT id FROM parejas WHERE user1_id = auth.uid() OR user2_id = auth.uid()));
CREATE POLICY rls_ventas       ON ventas       FOR ALL USING (pareja_id IN (SELECT id FROM parejas WHERE user1_id = auth.uid() OR user2_id = auth.uid()));
CREATE POLICY rls_ventas_items ON ventas_items FOR ALL USING (venta_id  IN (SELECT id FROM ventas  WHERE pareja_id IN (SELECT id FROM parejas WHERE user1_id = auth.uid() OR user2_id = auth.uid())));

SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('clientes','ventas','ventas_items');
