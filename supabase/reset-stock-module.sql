-- ============================================
-- RESET STOCK MODULE
-- ============================================
-- À exécuter UNIQUEMENT si la migration 019 a été appliquée partiellement
-- et qu'on veut repartir d'un état propre. Aucune donnée métier n'est perdue
-- (le module n'est pas encore en prod). À lancer AVANT de re-jouer 019.

-- 1. Trigger + fonction de décrément
DROP TRIGGER IF EXISTS decrement_stock_on_order_status ON public.orders;
DROP FUNCTION IF EXISTS public.decrement_stock_for_order();

-- 2. Realtime publications (ignore les erreurs si la table n'y est pas)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.stock_movements;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.delivery_scans;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.ingredients;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. Tables (ordre inverse des FK)
DROP TABLE IF EXISTS public.stock_order_decrements CASCADE;
DROP TABLE IF EXISTS public.stock_alerts_log CASCADE;
DROP TABLE IF EXISTS public.stock_movements CASCADE;
DROP TABLE IF EXISTS public.delivery_scans CASCADE;
DROP TABLE IF EXISTS public.recipe_items CASCADE;
DROP TABLE IF EXISTS public.recipes CASCADE;
DROP TABLE IF EXISTS public.ingredients CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;

-- 4. Colonnes ajoutées sur restaurants (on garde stock_module_active /
--    stock_enabled de la migration 016 qui sont indépendants).
ALTER TABLE public.restaurants
  DROP COLUMN IF EXISTS stock_config,
  DROP COLUMN IF EXISTS stock_stripe_subscription_id,
  DROP COLUMN IF EXISTS stock_subscription_status;
