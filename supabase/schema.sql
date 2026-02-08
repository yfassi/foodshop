-- ============================================
-- FOODSHOP - Schema de base de donnees
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- RESTAURANTS
-- ============================================
CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  opening_hours JSONB DEFAULT '{
    "monday": {"open": "11:00", "close": "22:00"},
    "tuesday": {"open": "11:00", "close": "22:00"},
    "wednesday": {"open": "11:00", "close": "22:00"},
    "thursday": {"open": "11:00", "close": "22:00"},
    "friday": {"open": "11:00", "close": "23:00"},
    "saturday": {"open": "11:00", "close": "23:00"},
    "sunday": {"open": "12:00", "close": "22:00"}
  }'::jsonb,
  is_accepting_orders BOOLEAN NOT NULL DEFAULT true,
  owner_id UUID REFERENCES auth.users(id),
  stripe_account_id TEXT,
  stripe_onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_restaurants_slug ON public.restaurants(slug);
CREATE INDEX idx_restaurants_owner ON public.restaurants(owner_id);

-- ============================================
-- CATEGORIES
-- ============================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_restaurant ON public.categories(restaurant_id);

-- ============================================
-- PRODUCTS
-- ============================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL, -- Price in CENTS (e.g., 850 = 8.50 EUR)
  image_url TEXT,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category ON public.products(category_id);

-- ============================================
-- MODIFIER GROUPS
-- ============================================
CREATE TABLE public.modifier_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  min_select INTEGER NOT NULL DEFAULT 0,
  max_select INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_modifier_groups_product ON public.modifier_groups(product_id);

-- ============================================
-- MODIFIERS
-- ============================================
CREATE TABLE public.modifiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  price_extra INTEGER NOT NULL DEFAULT 0,
  group_id UUID NOT NULL REFERENCES public.modifier_groups(id) ON DELETE CASCADE,
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_modifiers_group ON public.modifiers(group_id);

-- ============================================
-- ORDERS
-- ============================================
CREATE TYPE order_status AS ENUM ('new', 'preparing', 'ready', 'done', 'cancelled');

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number SERIAL,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_info JSONB NOT NULL DEFAULT '{}',
  items JSONB NOT NULL DEFAULT '[]',
  status order_status NOT NULL DEFAULT 'new',
  total_price INTEGER NOT NULL,
  pickup_time TIMESTAMPTZ,
  payment_method TEXT NOT NULL DEFAULT 'on_site',
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_restaurant ON public.orders(restaurant_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created ON public.orders(created_at DESC);
CREATE INDEX idx_orders_stripe_session ON public.orders(stripe_session_id);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_restaurants_updated_at
  BEFORE UPDATE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS
-- ============================================
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Public: read restaurants" ON public.restaurants FOR SELECT USING (true);
CREATE POLICY "Public: read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public: read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public: read modifier_groups" ON public.modifier_groups FOR SELECT USING (true);
CREATE POLICY "Public: read modifiers" ON public.modifiers FOR SELECT USING (true);

-- Orders: anyone can insert and read
CREATE POLICY "Public: insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public: read orders" ON public.orders FOR SELECT USING (true);

-- Orders: only owner can update
CREATE POLICY "Owner: update orders" ON public.orders FOR UPDATE
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

-- Owner: manage restaurant
CREATE POLICY "Owner: update restaurant" ON public.restaurants FOR UPDATE
  USING (owner_id = auth.uid());

-- Owner: manage categories
CREATE POLICY "Owner: insert categories" ON public.categories FOR INSERT
  WITH CHECK (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));
CREATE POLICY "Owner: update categories" ON public.categories FOR UPDATE
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));
CREATE POLICY "Owner: delete categories" ON public.categories FOR DELETE
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

-- Owner: manage products
CREATE POLICY "Owner: insert products" ON public.products FOR INSERT
  WITH CHECK (category_id IN (
    SELECT c.id FROM public.categories c JOIN public.restaurants r ON r.id = c.restaurant_id WHERE r.owner_id = auth.uid()
  ));
CREATE POLICY "Owner: update products" ON public.products FOR UPDATE
  USING (category_id IN (
    SELECT c.id FROM public.categories c JOIN public.restaurants r ON r.id = c.restaurant_id WHERE r.owner_id = auth.uid()
  ));
CREATE POLICY "Owner: delete products" ON public.products FOR DELETE
  USING (category_id IN (
    SELECT c.id FROM public.categories c JOIN public.restaurants r ON r.id = c.restaurant_id WHERE r.owner_id = auth.uid()
  ));

-- Owner: manage modifier groups
CREATE POLICY "Owner: insert modifier_groups" ON public.modifier_groups FOR INSERT
  WITH CHECK (product_id IN (
    SELECT p.id FROM public.products p JOIN public.categories c ON c.id = p.category_id JOIN public.restaurants r ON r.id = c.restaurant_id WHERE r.owner_id = auth.uid()
  ));
CREATE POLICY "Owner: update modifier_groups" ON public.modifier_groups FOR UPDATE
  USING (product_id IN (
    SELECT p.id FROM public.products p JOIN public.categories c ON c.id = p.category_id JOIN public.restaurants r ON r.id = c.restaurant_id WHERE r.owner_id = auth.uid()
  ));
CREATE POLICY "Owner: delete modifier_groups" ON public.modifier_groups FOR DELETE
  USING (product_id IN (
    SELECT p.id FROM public.products p JOIN public.categories c ON c.id = p.category_id JOIN public.restaurants r ON r.id = c.restaurant_id WHERE r.owner_id = auth.uid()
  ));

-- Owner: manage modifiers
CREATE POLICY "Owner: insert modifiers" ON public.modifiers FOR INSERT
  WITH CHECK (group_id IN (
    SELECT mg.id FROM public.modifier_groups mg JOIN public.products p ON p.id = mg.product_id JOIN public.categories c ON c.id = p.category_id JOIN public.restaurants r ON r.id = c.restaurant_id WHERE r.owner_id = auth.uid()
  ));
CREATE POLICY "Owner: update modifiers" ON public.modifiers FOR UPDATE
  USING (group_id IN (
    SELECT mg.id FROM public.modifier_groups mg JOIN public.products p ON p.id = mg.product_id JOIN public.categories c ON c.id = p.category_id JOIN public.restaurants r ON r.id = c.restaurant_id WHERE r.owner_id = auth.uid()
  ));
CREATE POLICY "Owner: delete modifiers" ON public.modifiers FOR DELETE
  USING (group_id IN (
    SELECT mg.id FROM public.modifier_groups mg JOIN public.products p ON p.id = mg.product_id JOIN public.categories c ON c.id = p.category_id JOIN public.restaurants r ON r.id = c.restaurant_id WHERE r.owner_id = auth.uid()
  ));

-- ============================================
-- REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
