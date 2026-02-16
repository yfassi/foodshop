-- ============================================
-- CUSTOMER PROFILES
-- ============================================
CREATE TABLE public.customer_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_profiles_user ON public.customer_profiles(user_id);

CREATE TRIGGER set_customer_profiles_updated_at
  BEFORE UPDATE ON public.customer_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer: read own profile" ON public.customer_profiles
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Customer: insert own profile" ON public.customer_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Customer: update own profile" ON public.customer_profiles
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================
-- WALLETS
-- ============================================
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, restaurant_id)
);

CREATE INDEX idx_wallets_user ON public.wallets(user_id);
CREATE INDEX idx_wallets_restaurant ON public.wallets(restaurant_id);

CREATE TRIGGER set_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer: read own wallet" ON public.wallets
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Owner: read restaurant wallets" ON public.wallets
  FOR SELECT USING (restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  ));

-- ============================================
-- WALLET TRANSACTIONS
-- ============================================
DO $$ BEGIN
  CREATE TYPE wallet_tx_type AS ENUM ('topup_stripe', 'topup_admin', 'payment', 'refund');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  type wallet_tx_type NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  order_id UUID REFERENCES public.orders(id),
  stripe_session_id TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wallet_tx_wallet ON public.wallet_transactions(wallet_id);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer: read own transactions" ON public.wallet_transactions
  FOR SELECT USING (wallet_id IN (
    SELECT id FROM public.wallets WHERE user_id = auth.uid()
  ));
CREATE POLICY "Owner: read restaurant transactions" ON public.wallet_transactions
  FOR SELECT USING (wallet_id IN (
    SELECT w.id FROM public.wallets w
    JOIN public.restaurants r ON r.id = w.restaurant_id
    WHERE r.owner_id = auth.uid()
  ));

-- ============================================
-- ATOMIC WALLET DEDUCTION FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION deduct_wallet_balance(
  p_wallet_id UUID,
  p_amount INTEGER,
  p_order_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  UPDATE public.wallets
  SET balance = balance - p_amount
  WHERE id = p_wallet_id AND balance >= p_amount
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  INSERT INTO public.wallet_transactions (wallet_id, type, amount, balance_after, order_id)
  VALUES (p_wallet_id, 'payment', -p_amount, v_new_balance, p_order_id);

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
