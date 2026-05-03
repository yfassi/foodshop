-- Add Stripe Customer ID for the TaapR platform subscription billing.
-- This is distinct from `stripe_account_id` (which is the restaurant's
-- Connect Express account used to receive customer payments).
-- The customer ID points to the restaurant's billing record on the
-- TaapR Stripe account itself, used to open the Customer Portal so the
-- owner can update payment methods, change plan, view invoices, etc.

alter table public.restaurants
  add column if not exists stripe_customer_id text;

comment on column public.restaurants.stripe_customer_id is
  'Stripe Customer ID on the TaapR platform account (not the connected account). Used by the Customer Portal to manage the TaapR subscription.';
