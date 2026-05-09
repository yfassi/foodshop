-- Track when the customer confirmation email has been sent.
-- Used as an idempotency guard so we never send twice (webhook retry, etc.).
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMPTZ;
