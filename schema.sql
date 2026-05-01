-- ============================================================
-- PlaceStore — Schema SQL v1.0
-- Ejecutar en Neon.tech Query Editor (en orden)
-- ============================================================

-- 1. STORES
CREATE TABLE IF NOT EXISTS stores (
  id                        SERIAL PRIMARY KEY,
  clerk_id                  TEXT NOT NULL,
  slug                      TEXT NOT NULL,
  store_name                TEXT NOT NULL,
  whatsapp_number           TEXT NOT NULL,
  location_city             TEXT NOT NULL,
  logo_url                  TEXT,
  whatsapp_message_template TEXT DEFAULT '¡Hola! Vi tu catálogo en PlaceStore y me interesa: {product}. ¿Está disponible?',
  is_active                 BOOLEAN NOT NULL DEFAULT false,
  trial_expires             TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS subscriptions (
  id         SERIAL PRIMARY KEY,
  store_id   INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  status     TEXT NOT NULL CHECK (status IN ('trial', 'active', 'expired', 'cancelled')),
  plan       TEXT NOT NULL DEFAULT 'basic',
  starts_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id           SERIAL PRIMARY KEY,
  store_id     INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  amount_bs    NUMERIC(10,2) NOT NULL,
  method       TEXT NOT NULL CHECK (method IN ('tigo_money', 'bank_transfer')),
  reference    TEXT,
  receipt_url  TEXT,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  verified_by  TEXT,
  verified_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. PRODUCT_CATEGORIES
CREATE TABLE IF NOT EXISTS product_categories (
  id         SERIAL PRIMARY KEY,
  store_id   INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id           SERIAL PRIMARY KEY,
  store_id     INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  category_id  INTEGER REFERENCES product_categories(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  price_bs     NUMERIC(10,2) NOT NULL,
  description  TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  views_count  INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. PRODUCT_IMAGES
CREATE TABLE IF NOT EXISTS product_images (
  id             SERIAL PRIMARY KEY,
  product_id     INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  cloudinary_id  TEXT NOT NULL,
  url            TEXT NOT NULL,
  is_primary     BOOLEAN NOT NULL DEFAULT false,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES DE RENDIMIENTO
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_slug     ON stores(slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_clerk_id ON stores(clerk_id);
CREATE INDEX        IF NOT EXISTS idx_stores_city     ON stores(location_city);
CREATE INDEX        IF NOT EXISTS idx_products_feed   ON products(store_id, views_count DESC);
CREATE INDEX        IF NOT EXISTS idx_images_primary  ON product_images(product_id, is_primary);
CREATE INDEX        IF NOT EXISTS idx_subs_status     ON subscriptions(status);
CREATE INDEX        IF NOT EXISTS idx_payments_status ON payments(status);

-- ============================================================
-- FUNCIÓN + CRON: expiración automática diaria
-- ============================================================
CREATE OR REPLACE FUNCTION expire_subscriptions()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- Marcar suscripciones vencidas
  UPDATE subscriptions
  SET    status = 'expired'
  WHERE  status IN ('trial', 'active')
  AND    expires_at < NOW();

  -- Desactivar tiendas cuya suscripción vigente esté vencida
  UPDATE stores s
  SET    is_active = false
  WHERE  is_active = true
  AND    NOT EXISTS (
    SELECT 1 FROM subscriptions sub
    WHERE  sub.store_id = s.id
    AND    sub.status   IN ('trial', 'active')
    AND    sub.expires_at > NOW()
  );
END;
$$;
