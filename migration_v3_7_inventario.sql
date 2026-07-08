-- ================================================================
--  MIGRACIÓN INCREMENTAL — Fase 8: Inventario + Proveedores
--  Ejecutar en Supabase SQL Editor.
-- ================================================================

-- ── Proveedores (vendedores dentro de Buyee u otras plataformas) ──
CREATE TABLE IF NOT EXISTS proveedores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pareja_id   UUID NOT NULL REFERENCES parejas(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  plataforma  TEXT NOT NULL DEFAULT 'Buyee', -- Buyee, MercadoLibre, etc.
  url         TEXT,
  nota        TEXT,
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── Lotes de compra ───────────────────────────────────────────────
-- Un lote = una orden de compra (ej: compra en Buyee con N cartas)
-- Los costos de envío y aduanas se prorratean entre los productos del lote
CREATE TABLE IF NOT EXISTS lotes_compra (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pareja_id       UUID NOT NULL REFERENCES parejas(id) ON DELETE CASCADE,
  proveedor_id    UUID REFERENCES proveedores(id),
  nombre          TEXT NOT NULL,  -- ej: "Buyee Lote Mayo 2026"
  fecha_compra    DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_llegada   DATE,
  costo_envio     NUMERIC(14,2) NOT NULL DEFAULT 0,
  costo_aduanas   NUMERIC(14,2) NOT NULL DEFAULT 0,
  costo_otros     NUMERIC(14,2) NOT NULL DEFAULT 0,
  tipo_cambio     NUMERIC(10,4) DEFAULT 1, -- JPY→MXN si aplica
  moneda_origen   TEXT DEFAULT 'MXN',
  nota            TEXT,
  estado          TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','en_transito','recibido','cancelado')),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Productos / Inventario ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS productos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pareja_id       UUID NOT NULL REFERENCES parejas(id) ON DELETE CASCADE,
  lote_id         UUID REFERENCES lotes_compra(id) ON DELETE SET NULL,
  -- Identificación
  nombre_jp       TEXT,           -- nombre en japonés
  nombre_en       TEXT,           -- nombre en inglés
  serie           TEXT,           -- ej: "Scarlet & Violet"
  numero_carta    TEXT,           -- ej: "025/198"
  idioma          TEXT NOT NULL DEFAULT 'JP' CHECK (idioma IN ('JP','EN','ambos')),
  -- Cantidades
  cantidad_compra INT NOT NULL DEFAULT 1,   -- cuántas compraste
  cantidad_stock  INT NOT NULL DEFAULT 0,   -- cuántas quedan (se descuenta al vender)
  -- Precios
  precio_unitario_compra NUMERIC(14,2) NOT NULL DEFAULT 0, -- precio por carta
  precio_venta    NUMERIC(14,2),  -- precio al que vendes cada una
  -- El costo real se calcula: precio_unitario_compra + (costos_lote / total_unidades_lote)
  -- Se guarda el costo_extra_prorrateado para no recalcular siempre
  costo_extra_prorrateado NUMERIC(14,2) NOT NULL DEFAULT 0,
  -- Metadata
  condicion       TEXT DEFAULT 'mint' CHECK (condicion IN ('mint','near_mint','played','damaged')),
  imagen_url      TEXT,
  nota            TEXT,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE proveedores     ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotes_compra    ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos       ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_proveedores ON proveedores FOR ALL USING (
  pareja_id IN (SELECT id FROM parejas WHERE user1_id = auth.uid() OR user2_id = auth.uid())
);
CREATE POLICY rls_lotes_compra ON lotes_compra FOR ALL USING (
  pareja_id IN (SELECT id FROM parejas WHERE user1_id = auth.uid() OR user2_id = auth.uid())
);
CREATE POLICY rls_productos ON productos FOR ALL USING (
  pareja_id IN (SELECT id FROM parejas WHERE user1_id = auth.uid() OR user2_id = auth.uid())
);

-- ================================================================
--  Verificación
-- ================================================================
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('proveedores','lotes_compra','productos')
ORDER BY table_name;
