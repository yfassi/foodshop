-- Track how much wallet credit was used for partial payments
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS wallet_amount_used INTEGER NOT NULL DEFAULT 0;
