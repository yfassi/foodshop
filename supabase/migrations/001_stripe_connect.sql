-- Add Stripe Connect fields to restaurants
ALTER TABLE public.restaurants
  ADD COLUMN stripe_account_id TEXT,
  ADD COLUMN stripe_onboarding_complete BOOLEAN NOT NULL DEFAULT false;
