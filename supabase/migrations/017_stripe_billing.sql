-- ============================================
-- 017 - STRIPE BILLING (subscriptions for the platform)
-- ============================================
-- Adds the Stripe Customer + Subscription bookkeeping columns. Module
-- flags (stock_module_active, etc.) live on migration 016.
-- Tier values follow migration 016: 'plat' | 'menu' | 'carte'.
-- ============================================

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- stripe_subscription_status values mirror Stripe:
-- 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'
-- 'incomplete' | 'incomplete_expired' | 'paused'

CREATE INDEX IF NOT EXISTS idx_restaurants_stripe_customer
  ON public.restaurants(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_restaurants_stripe_subscription
  ON public.restaurants(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
