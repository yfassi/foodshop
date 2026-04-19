-- ============================================
-- 015 - DELIVERY MODULE
-- ============================================

-- ---- Subscription / add-on gating on restaurants ----
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'essentiel',
  ADD COLUMN IF NOT EXISTS delivery_addon_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_config JSONB NOT NULL DEFAULT '{}'::jsonb;

-- delivery_config shape:
-- {
--   "coords": { "lat": number, "lng": number },
--   "prep_time_minutes": number,
--   "max_radius_m": number,
--   "zones": [
--     { "id": "uuid", "label": string, "radius_m": number, "fee": number, "min_order": number }
--   ]
-- }

-- ---- Delivery status enum ----
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_status') THEN
    CREATE TYPE delivery_status AS ENUM (
      'pending',
      'assigned',
      'picked_up',
      'delivered',
      'failed'
    );
  END IF;
END $$;

-- ---- Drivers table ----
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  vehicle TEXT,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_drivers_restaurant ON public.drivers(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_drivers_user ON public.drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_drivers_phone ON public.drivers(phone);

CREATE TRIGGER set_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---- Orders: delivery columns ----
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_status delivery_status,
  ADD COLUMN IF NOT EXISTS delivery_address JSONB,
  ADD COLUMN IF NOT EXISTS delivery_fee INTEGER,
  ADD COLUMN IF NOT EXISTS delivery_zone_id TEXT,
  ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_tip INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_distance_m INTEGER;

CREATE INDEX IF NOT EXISTS idx_orders_driver ON public.orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON public.orders(delivery_status)
  WHERE delivery_status IS NOT NULL;

-- ---- RLS ----
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- Restaurant owner: full CRUD on their drivers
CREATE POLICY "Owner: read drivers" ON public.drivers FOR SELECT
  USING (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Owner: insert drivers" ON public.drivers FOR INSERT
  WITH CHECK (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Owner: update drivers" ON public.drivers FOR UPDATE
  USING (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Owner: delete drivers" ON public.drivers FOR DELETE
  USING (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  ));

-- Driver: read own driver rows
CREATE POLICY "Driver: read own rows" ON public.drivers FOR SELECT
  USING (user_id = auth.uid());

-- Driver: can update delivery orders of their restaurant
CREATE POLICY "Driver: update delivery orders" ON public.orders FOR UPDATE
  USING (
    order_type = 'delivery'
    AND restaurant_id IN (
      SELECT restaurant_id FROM public.drivers
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- ---- Realtime ----
ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers;
