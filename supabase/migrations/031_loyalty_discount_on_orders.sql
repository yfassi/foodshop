-- Loyalty discount applied to an order. Discounts are "remise directe sur
-- l'addition en cours" — there's no voucher entity; the bonus consumes the
-- tier's points by being recorded here.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS loyalty_tier_id TEXT,
  ADD COLUMN IF NOT EXISTS loyalty_discount_amount INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_points_used INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_orders_loyalty_points_used
  ON public.orders (customer_user_id, restaurant_id)
  WHERE loyalty_points_used > 0;
