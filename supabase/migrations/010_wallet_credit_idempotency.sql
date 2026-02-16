-- Atomic wallet balance credit (mirrors deduct_wallet_balance)
CREATE OR REPLACE FUNCTION credit_wallet_balance(
  p_wallet_id UUID,
  p_amount INTEGER,
  p_type TEXT DEFAULT 'topup_stripe',
  p_stripe_session_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  UPDATE public.wallets
  SET balance = balance + p_amount
  WHERE id = p_wallet_id
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  INSERT INTO public.wallet_transactions (wallet_id, type, amount, balance_after, stripe_session_id, description, created_by)
  VALUES (p_wallet_id, p_type, p_amount, v_new_balance, p_stripe_session_id, p_description, p_created_by);

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- Unique constraint on stripe_session_id for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_transactions_stripe_session
  ON public.wallet_transactions (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

-- Index for customer order lookups
CREATE INDEX IF NOT EXISTS idx_orders_customer_user_id
  ON public.orders (customer_user_id)
  WHERE customer_user_id IS NOT NULL;

-- Composite index for admin dashboard order queries
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status_created
  ON public.orders (restaurant_id, status, created_at DESC);
