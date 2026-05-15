-- ============================================
-- COUNTER ORDERS — pager number support
-- ============================================
-- Adds an optional pager (bipper) number to orders so admin staff can mark
-- which device a customer is holding when ordering at the counter.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pager_number TEXT;
