-- ============================================
-- 016 - PRICING TIERS ALIGNMENT + NEW MODULES
-- ============================================
-- Aligns subscription_tier values with new pricing (plat / menu / carte),
-- adds module flags (stock), API keys table, floor plan,
-- and a restaurant_admins pivot for future multi-restaurant ownership.
-- ============================================

-- ---- 1. Backfill existing subscription_tier values ----
-- Map old values to new before locking them with a CHECK constraint.
UPDATE public.restaurants
SET subscription_tier = CASE subscription_tier
  WHEN 'essentiel' THEN 'plat'
  WHEN 'pro'       THEN 'menu'
  WHEN 'business'  THEN 'carte'
  ELSE 'plat'
END
WHERE subscription_tier IN ('essentiel', 'pro', 'business')
   OR subscription_tier IS NULL;

-- ---- 2. Change default + add CHECK constraint ----
ALTER TABLE public.restaurants
  ALTER COLUMN subscription_tier SET DEFAULT 'plat';

ALTER TABLE public.restaurants
  DROP CONSTRAINT IF EXISTS restaurants_subscription_tier_check;

ALTER TABLE public.restaurants
  ADD CONSTRAINT restaurants_subscription_tier_check
  CHECK (subscription_tier IN ('plat', 'menu', 'carte'));

-- ---- 3. New module flags + per-restaurant feature flags ----
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS stock_module_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS floor_plan JSONB NOT NULL DEFAULT '{}'::jsonb;

-- floor_plan shape (Le Menu+):
-- {
--   "tables": [
--     { "id": "uuid", "label": "1", "x": number, "y": number,
--       "width": number, "height": number, "shape": "rect" | "circle",
--       "seats": number }
--   ],
--   "grid": { "cols": number, "rows": number },
--   "updated_at": "timestamp"
-- }

-- ---- 4. API keys table (Carte Blanche only) ----
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,                  -- visible prefix shown in UI ("tpr_live_abc")
  hashed_key TEXT NOT NULL,              -- bcrypt/SHA-256 hash of the full key
  scopes TEXT[] NOT NULL DEFAULT ARRAY['read']::TEXT[],
  last_used_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, prefix)
);

CREATE INDEX IF NOT EXISTS idx_api_keys_restaurant ON public.api_keys(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON public.api_keys(prefix) WHERE revoked_at IS NULL;

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner: read api_keys" ON public.api_keys FOR SELECT
  USING (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Owner: insert api_keys" ON public.api_keys FOR INSERT
  WITH CHECK (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Owner: update api_keys" ON public.api_keys FOR UPDATE
  USING (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Owner: delete api_keys" ON public.api_keys FOR DELETE
  USING (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  ));

-- ---- 5. Restaurant admins pivot (multi-restaurant ownership groundwork) ----
-- This table prepares the schema for multi-restaurant ownership.
-- For now, login & layout still use restaurants.owner_id (1:1).
-- Future: switch all queries to use this pivot.
CREATE TABLE IF NOT EXISTS public.restaurant_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'manager')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_restaurant_admins_restaurant ON public.restaurant_admins(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_admins_user ON public.restaurant_admins(user_id);

-- Backfill: every existing owner becomes an "owner" entry in the pivot.
INSERT INTO public.restaurant_admins (restaurant_id, user_id, role)
SELECT id, owner_id, 'owner'
FROM public.restaurants
WHERE owner_id IS NOT NULL
ON CONFLICT (restaurant_id, user_id) DO NOTHING;

ALTER TABLE public.restaurant_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User: read own admin rows" ON public.restaurant_admins FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Owner: read all admins of own resto" ON public.restaurant_admins FOR SELECT
  USING (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Owner: insert admins" ON public.restaurant_admins FOR INSERT
  WITH CHECK (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Owner: delete admins" ON public.restaurant_admins FOR DELETE
  USING (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  ));

-- ---- 6. Multi-restaurant capacity enforcement ----
-- Function: cap the number of restaurants per owner based on subscription_tier.
-- - plat / menu : 1 restaurant max
-- - carte       : 5 restaurants max
-- This trigger applies on INSERT and on UPDATE of owner_id.
CREATE OR REPLACE FUNCTION public.enforce_restaurant_capacity()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  cap INTEGER;
  new_owner UUID;
  new_tier TEXT;
BEGIN
  new_owner := NEW.owner_id;
  IF new_owner IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine cap from the most "premium" tier owned by this user.
  SELECT
    CASE
      WHEN MAX(CASE subscription_tier WHEN 'carte' THEN 3 WHEN 'menu' THEN 2 WHEN 'plat' THEN 1 ELSE 0 END) >= 3 THEN 5
      WHEN MAX(CASE subscription_tier WHEN 'carte' THEN 3 WHEN 'menu' THEN 2 WHEN 'plat' THEN 1 ELSE 0 END) >= 1 THEN 1
      ELSE 1
    END,
    MAX(subscription_tier)
  INTO cap, new_tier
  FROM public.restaurants
  WHERE owner_id = new_owner AND id <> NEW.id;

  -- Include NEW row's tier in the cap calc if it's higher.
  IF NEW.subscription_tier = 'carte' THEN
    cap := 5;
  END IF;

  SELECT COUNT(*) INTO current_count
  FROM public.restaurants
  WHERE owner_id = new_owner AND id <> NEW.id;

  IF (current_count + 1) > cap THEN
    RAISE EXCEPTION 'Capacity exceeded: this owner already has % restaurants (cap = % for tier "%")',
      current_count, cap, COALESCE(NEW.subscription_tier, 'plat');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_restaurant_capacity ON public.restaurants;
CREATE TRIGGER check_restaurant_capacity
  BEFORE INSERT OR UPDATE OF owner_id, subscription_tier ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.enforce_restaurant_capacity();

-- ---- 7. Realtime publications for new tables ----
ALTER PUBLICATION supabase_realtime ADD TABLE public.api_keys;
ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_admins;
