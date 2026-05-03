-- Security fixes from /cso comprehensive audit (2026-05-03).
-- Addresses: orders public read (CRITICAL), deduct_wallet_balance RPC bypass (CRITICAL),
-- verification-documents bucket public (CRITICAL), queue_tickets public read (LOW),
-- credit_wallet_balance RPC hardening (defense in depth).

-- ============================================
-- F2: Lock down public read on orders
-- ============================================
DROP POLICY IF EXISTS "Public: read orders" ON public.orders;

-- Anonymous customers (guest checkout) lose direct SELECT access. Server
-- components fetch via service-role using the unguessable order UUID in the URL.
-- Authenticated paths (logged-in customer / restaurant owner) keep direct access:
CREATE POLICY "Owner: read orders" ON public.orders FOR SELECT
  USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
    OR (customer_user_id IS NOT NULL AND customer_user_id = auth.uid())
  );

-- Note: guest checkouts lose realtime postgres_changes updates on the
-- order-confirmation page. Push notifications still fire (server-side via
-- webhook). To restore live status for guests without re-opening the table,
-- migrate OrderStatusTracker to a tokenised polling endpoint (server reads
-- with service-role + checks the orderId UUID matches) — out of scope here.

-- ============================================
-- F4: deduct_wallet_balance — add caller check + revoke from anon/authenticated
-- ============================================
CREATE OR REPLACE FUNCTION deduct_wallet_balance(
  p_wallet_id UUID,
  p_amount INTEGER,
  p_order_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_new_balance INTEGER;
  v_caller UUID;
  v_wallet_owner UUID;
  v_restaurant_owner UUID;
BEGIN
  v_caller := auth.uid();

  SELECT w.user_id, r.owner_id
    INTO v_wallet_owner, v_restaurant_owner
    FROM public.wallets w
    JOIN public.restaurants r ON r.id = w.restaurant_id
   WHERE w.id = p_wallet_id;

  IF v_wallet_owner IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  -- Only the wallet owner or the restaurant owner can deduct.
  IF v_caller IS DISTINCT FROM v_wallet_owner
     AND v_caller IS DISTINCT FROM v_restaurant_owner THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

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

REVOKE EXECUTE ON FUNCTION public.deduct_wallet_balance(UUID, INTEGER, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_wallet_balance(UUID, INTEGER, UUID) TO service_role;

-- credit_wallet_balance is non-DEFINER but still RPC-exposed; revoke for defense in depth.
DO $$
DECLARE
  fn_signature TEXT;
BEGIN
  SELECT pg_get_function_identity_arguments(p.oid)
    INTO fn_signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'credit_wallet_balance'
   LIMIT 1;
  IF fn_signature IS NOT NULL THEN
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.credit_wallet_balance(%s) FROM PUBLIC, anon, authenticated', fn_signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.credit_wallet_balance(%s) TO service_role', fn_signature);
  END IF;
END $$;

-- ============================================
-- F5: verification-documents bucket — make private + restrict reads to owner/super-admin via service-role
-- ============================================
UPDATE storage.buckets SET public = false WHERE id = 'verification-documents';

-- Migrate existing rows: strip the public URL prefix so the column stores the
-- storage object key. The super-admin API now signs URLs at read time.
UPDATE public.restaurants
   SET verification_document_url = regexp_replace(
         verification_document_url,
         '^.*/storage/v1/object/public/verification-documents/',
         ''
       )
 WHERE verification_document_url IS NOT NULL
   AND verification_document_url LIKE '%/storage/v1/object/public/verification-documents/%';

DROP POLICY IF EXISTS "Public read verification documents" ON storage.objects;

-- Only the restaurant owner can read their own verification document directly via
-- Supabase client; super-admin reads go through the API which uses service-role
-- (which bypasses RLS by design). The matching uses the storage object name:
-- the path stored in restaurants.verification_document_url equals storage.objects.name.
CREATE POLICY "Owner read verification documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verification-documents'
    AND name IN (
      SELECT verification_document_url
        FROM public.restaurants
       WHERE owner_id = auth.uid()
         AND verification_document_url IS NOT NULL
    )
  );

-- ============================================
-- F13: queue_tickets — restrict public SELECT
-- ============================================
DROP POLICY IF EXISTS "Anyone can view queue tickets" ON public.queue_tickets;

CREATE POLICY "Owner or self can view queue tickets" ON public.queue_tickets
  FOR SELECT
  USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
    OR (customer_user_id IS NOT NULL AND customer_user_id = auth.uid())
  );

-- Anonymous customers query their own ticket via /api/queue (service-role).
-- External scrapers can no longer enumerate tickets across restaurants with
-- the anon key.
