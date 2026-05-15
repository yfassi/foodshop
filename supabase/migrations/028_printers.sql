-- ============================================
-- 028 - PRINTERS (cloud-pull thermal printers)
-- ============================================
-- WiFi thermal printers (Epson TM-m30III "Server Direct Print"). The printer
-- polls /api/print/poll over HTTPS, receives ePOS-Print XML jobs, prints them,
-- then POSTs back a status. No browser, no Bluetooth, no pairing — works
-- regardless of the staff device (iPad / Android / desktop).
-- ============================================

CREATE TABLE IF NOT EXISTS public.printers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id       UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  kind                TEXT NOT NULL DEFAULT 'epson_sdp'
                        CHECK (kind IN ('epson_sdp', 'star_cloudprnt')),
  token_prefix        TEXT NOT NULL,           -- short visible prefix shown in the UI
  token_hash          TEXT NOT NULL,           -- sha256(full token) hex — never exposed to the client
  auto_print_kitchen  BOOLEAN NOT NULL DEFAULT true,
  auto_print_receipt  BOOLEAN NOT NULL DEFAULT false,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  last_seen_at        TIMESTAMPTZ,             -- updated on every poll (heartbeat)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (token_prefix)
);

CREATE INDEX IF NOT EXISTS idx_printers_restaurant ON public.printers(restaurant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_printers_token_hash ON public.printers(token_hash);

CREATE TRIGGER set_printers_updated_at
  BEFORE UPDATE ON public.printers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.printers ENABLE ROW LEVEL SECURITY;

-- Owner-scoped CRUD (same pattern as api_keys in 016). The poll endpoint
-- authenticates via the printer token and runs through the service-role client,
-- which bypasses RLS — so no anon/printer policy is needed here.
CREATE POLICY "Owner: read printers" ON public.printers FOR SELECT
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

CREATE POLICY "Owner: insert printers" ON public.printers FOR INSERT
  WITH CHECK (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

CREATE POLICY "Owner: update printers" ON public.printers FOR UPDATE
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

CREATE POLICY "Owner: delete printers" ON public.printers FOR DELETE
  USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));
