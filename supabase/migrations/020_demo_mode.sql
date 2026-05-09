-- Demo mode: list of customer emails that pay with Stripe TEST keys
-- (real orders, real restaurant flow, but test payments).
-- Managed from /super-admin/demo-customers.

CREATE TABLE IF NOT EXISTS public.platform_demo_customers (
  email TEXT PRIMARY KEY,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT
);

-- Demo flag on orders (so confirmation page, restaurant view, webhook
-- can pick the right Stripe instance and surface a DEMO badge).
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_orders_is_demo
  ON public.orders(is_demo)
  WHERE is_demo = true;
