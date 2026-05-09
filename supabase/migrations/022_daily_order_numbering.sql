-- Daily per-restaurant order numbering.
--
-- Production was missing both the counter table and the RPC the checkout route
-- calls (`next_daily_order_number`). Result: every order fell back to `CB-000`.
-- The function was only declared in `supabase/schema.sql`, which is not applied
-- against the live project.

CREATE TABLE IF NOT EXISTS public.daily_order_counters (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID        NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_date      DATE        NOT NULL,
  prefix          TEXT        NOT NULL,
  current_count   INTEGER     NOT NULL DEFAULT 0,
  UNIQUE (restaurant_id, order_date, prefix)
);

CREATE INDEX IF NOT EXISTS idx_daily_counters_lookup
  ON public.daily_order_counters (restaurant_id, order_date, prefix);

ALTER TABLE public.daily_order_counters ENABLE ROW LEVEL SECURITY;

-- No direct policies: the table is only ever touched through the RPC below
-- (which runs as SECURITY DEFINER and therefore bypasses RLS). This keeps
-- counters tamper-proof from the client.

CREATE OR REPLACE FUNCTION public.next_daily_order_number(
  p_restaurant_id UUID,
  p_prefix        TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO public.daily_order_counters (restaurant_id, order_date, prefix, current_count)
  VALUES (p_restaurant_id, CURRENT_DATE, p_prefix, 1)
  ON CONFLICT (restaurant_id, order_date, prefix)
  DO UPDATE SET current_count = daily_order_counters.current_count + 1
  RETURNING current_count INTO v_count;

  RETURN p_prefix || '-' || LPAD(v_count::TEXT, 3, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.next_daily_order_number(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_daily_order_number(UUID, TEXT) TO anon, authenticated, service_role;
