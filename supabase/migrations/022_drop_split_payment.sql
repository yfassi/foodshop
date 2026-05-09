-- ============================================
-- 020 - DROP split_payment_enabled
-- ============================================
-- Feature retirée du produit. La colonne ne sert plus à rien.
ALTER TABLE public.restaurants
  DROP COLUMN IF EXISTS split_payment_enabled;
