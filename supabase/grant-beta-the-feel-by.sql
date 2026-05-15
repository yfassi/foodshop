-- ============================================
-- BETA ACCESS — restaurant "the feel by"
-- ============================================
-- Active gratuitement tous les modules payants pour le compte beta.
-- À exécuter dans le SQL editor Supabase.

-- 1. Vérifier d'abord quel restaurant on cible (un seul résultat attendu)
--    SELECT id, slug, name FROM public.restaurants WHERE name ILIKE '%feel%';

-- 2. Bascule beta : tier max + tous les addons activés
UPDATE public.restaurants
SET
  subscription_tier            = 'carte',     -- plan max → débloque floor_plan, api_keys, multi-resto
  delivery_addon_active        = true,        -- module Livraison (licence)
  delivery_enabled             = true,        -- module Livraison (toggle)
  stock_module_active          = true,        -- module Stock (licence)
  stock_enabled                = true,        -- module Stock (toggle)
  loyalty_enabled              = true,        -- programme fidélité
  queue_enabled                = true,        -- file d'attente
  wallet_topup_enabled         = true,        -- recharge wallet
  stock_subscription_status    = 'beta',      -- marqueur (pas géré par Stripe)
  stock_stripe_subscription_id = NULL,        -- pas de sub Stripe → cancel API renvoie 404, c'est OK
  verification_status          = 'verified'   -- skip la file de vérif KBIS
WHERE name ILIKE '%feel%by%'
   OR slug ILIKE '%feel%by%';

-- 3. Vérifier le résultat
SELECT
  slug,
  name,
  subscription_tier,
  delivery_addon_active,
  stock_module_active,
  stock_enabled,
  loyalty_enabled,
  queue_enabled,
  wallet_topup_enabled,
  verification_status
FROM public.restaurants
WHERE name ILIKE '%feel%by%' OR slug ILIKE '%feel%by%';
