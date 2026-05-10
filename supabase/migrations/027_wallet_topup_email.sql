-- Idempotency guard for wallet top-up receipt emails. Same pattern as
-- orders.confirmation_email_sent_at — set on first successful send, used
-- by sendWalletTopupEmail() to skip retries.

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS receipt_email_sent_at TIMESTAMPTZ;
