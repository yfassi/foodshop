-- ============================================
-- 029 - PRINT JOBS (queue for cloud-pull printers)
-- ============================================
-- One row per ticket to print. Printers claim pending jobs through the
-- claim_next_print_job RPC (atomic, concurrency-safe). The ePOS-Print XML
-- payload is rendered and frozen at enqueue time so the poll endpoint stays
-- trivially fast and the printed content can't drift after the fact.
-- ============================================

CREATE TABLE IF NOT EXISTS public.print_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  printer_id      UUID NOT NULL REFERENCES public.printers(id) ON DELETE CASCADE,
  order_id        UUID REFERENCES public.orders(id) ON DELETE SET NULL,  -- null for 'test' jobs
  job_type        TEXT NOT NULL CHECK (job_type IN ('kitchen', 'receipt', 'test')),
  source          TEXT NOT NULL DEFAULT 'auto' CHECK (source IN ('auto', 'manual')),
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'printing', 'done', 'error')),
  payload_xml     TEXT NOT NULL,
  attempts        INTEGER NOT NULL DEFAULT 0,
  error_message   TEXT,
  claimed_at      TIMESTAMPTZ,
  printed_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotency guard: at most one auto kitchen + one auto receipt per order, so
-- Stripe webhook retries / the order-confirmation fallback can't double-print.
-- Manual reprints (source = 'manual') are exempt so the "Imprimer" button always works.
CREATE UNIQUE INDEX IF NOT EXISTS uq_print_jobs_order_type
  ON public.print_jobs(order_id, job_type)
  WHERE order_id IS NOT NULL AND source = 'auto';

CREATE INDEX IF NOT EXISTS idx_print_jobs_poll
  ON public.print_jobs(printer_id, created_at)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_print_jobs_restaurant ON public.print_jobs(restaurant_id);

ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;

-- Owners can read their job history. All writes go through service-role API
-- routes (enqueue helper, poll endpoint, on-demand endpoint) which bypass RLS.
CREATE POLICY "Owner: read print_jobs" ON public.print_jobs FOR SELECT
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

-- Atomic job claim — SECURITY DEFINER, same philosophy as next_daily_order_number
-- (022). FOR UPDATE SKIP LOCKED makes concurrent polls safe: two printers, or a
-- printer retrying mid-flight, can never grab the same job.
CREATE OR REPLACE FUNCTION public.claim_next_print_job(p_printer_id UUID)
RETURNS public.print_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.print_jobs;
BEGIN
  SELECT * INTO v_job
  FROM public.print_jobs
  WHERE printer_id = p_printer_id AND status = 'pending'
  ORDER BY created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  UPDATE public.print_jobs
  SET status = 'printing', claimed_at = now(), attempts = attempts + 1
  WHERE id = v_job.id
  RETURNING * INTO v_job;

  RETURN v_job;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_next_print_job(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_next_print_job(UUID) TO service_role;
