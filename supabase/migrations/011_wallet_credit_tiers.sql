-- Add wallet topup tiers configuration to restaurants
ALTER TABLE public.restaurants
  ADD COLUMN wallet_topup_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN wallet_topup_tiers JSONB NOT NULL DEFAULT '[]'::jsonb;
