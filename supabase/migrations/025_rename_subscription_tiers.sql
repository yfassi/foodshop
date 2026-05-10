-- ============================================
-- 025 - RENAME SUBSCRIPTION TIERS
-- ============================================
-- Renames subscription_tier values to match the new public branding:
--   plat  -> essentiel  (39 €/mois, 1 resto)
--   menu  -> pro        (79 €/mois, 1 resto inclus, +39 €/resto)
--   carte -> groupe     (149 €/mois, jusqu'à 5 restos)
--
-- Also normalizes any leftover legacy strings ("essentiel"/"pro"/"business")
-- that may have survived the 016 migration.
-- ============================================

-- ---- 1. Drop existing CHECK constraint to allow updates ----
ALTER TABLE public.restaurants
  DROP CONSTRAINT IF EXISTS restaurants_subscription_tier_check;

-- ---- 2. Backfill existing rows ----
UPDATE public.restaurants
SET subscription_tier = CASE subscription_tier
  WHEN 'plat'      THEN 'essentiel'
  WHEN 'menu'      THEN 'pro'
  WHEN 'carte'     THEN 'groupe'
  WHEN 'business'  THEN 'groupe'  -- ultra-legacy
  ELSE 'essentiel'
END
WHERE subscription_tier IN ('plat', 'menu', 'carte', 'business', 'essentiel', 'pro')
   OR subscription_tier IS NULL;

-- ---- 3. New default + new CHECK constraint ----
ALTER TABLE public.restaurants
  ALTER COLUMN subscription_tier SET DEFAULT 'essentiel';

ALTER TABLE public.restaurants
  ADD CONSTRAINT restaurants_subscription_tier_check
  CHECK (subscription_tier IN ('essentiel', 'pro', 'groupe'));

-- ---- 4. Update capacity enforcement trigger ----
-- Replaces the function written in migration 016 with the new tier names.
-- - essentiel / pro : 1 restaurant max (Pro can add more via Stripe seat upsell)
-- - groupe          : 5 restaurants max
CREATE OR REPLACE FUNCTION public.enforce_restaurant_capacity()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  cap INTEGER;
  new_owner UUID;
BEGIN
  new_owner := NEW.owner_id;
  IF new_owner IS NULL THEN
    RETURN NEW;
  END IF;

  -- Cap is driven by the most premium tier owned by this user.
  SELECT
    CASE
      WHEN MAX(CASE subscription_tier
        WHEN 'groupe'    THEN 3
        WHEN 'pro'       THEN 2
        WHEN 'essentiel' THEN 1
        ELSE 0
      END) >= 3 THEN 5
      ELSE 1
    END
  INTO cap
  FROM public.restaurants
  WHERE owner_id = new_owner AND id <> NEW.id;

  IF NEW.subscription_tier = 'groupe' THEN
    cap := 5;
  END IF;

  SELECT COUNT(*) INTO current_count
  FROM public.restaurants
  WHERE owner_id = new_owner AND id <> NEW.id;

  IF (current_count + 1) > cap THEN
    RAISE EXCEPTION 'Capacity exceeded: this owner already has % restaurants (cap = % for tier "%")',
      current_count, cap, COALESCE(NEW.subscription_tier, 'essentiel');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
