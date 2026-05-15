-- ============================================
-- 030 - USB thermal printers (WebUSB bridge)
-- ============================================
-- USB-connected ESC/POS thermal printers (Xprinter, Epson TM-T20III, Star
-- TSP143IIIU…). They're driven by the cuisine display page through the browser
-- WebUSB API — no extra hardware, no install. The page polls
-- /api/print/web-poll, gets raw ESC/POS bytes, sends them to the device with
-- device.transferOut(), and reports back.
--
-- Reuses every other piece of the print pipeline (claim_next_print_job RPC,
-- per-printer tokens, auto_print_* flags, last_seen_at heartbeat). The only
-- divergences from Epson SDP are the payload format and the poll envelope.
-- ============================================

-- Allow a third kind, plus remember the chosen USB device per printer so the
-- station can auto-reconnect after a page reload without a second permission
-- prompt (Chrome filters navigator.usb.getDevices() by vendor/product IDs).
ALTER TABLE public.printers DROP CONSTRAINT IF EXISTS printers_kind_check;
ALTER TABLE public.printers
  ADD CONSTRAINT printers_kind_check
  CHECK (kind IN ('epson_sdp', 'star_cloudprnt', 'usb_thermal'));

ALTER TABLE public.printers
  ADD COLUMN IF NOT EXISTS usb_vendor_id  INTEGER,
  ADD COLUMN IF NOT EXISTS usb_product_id INTEGER;

-- Each job carries either an ePOS XML payload (Epson SDP) or raw ESC/POS bytes
-- (USB). Exactly one is set; CHECK enforces it so the poll endpoint never has
-- to guess.
ALTER TABLE public.print_jobs ALTER COLUMN payload_xml DROP NOT NULL;
ALTER TABLE public.print_jobs
  ADD COLUMN IF NOT EXISTS payload_escpos BYTEA;

ALTER TABLE public.print_jobs DROP CONSTRAINT IF EXISTS print_jobs_payload_one_of;
ALTER TABLE public.print_jobs
  ADD CONSTRAINT print_jobs_payload_one_of
  CHECK (
    (payload_xml IS NOT NULL AND payload_escpos IS NULL)
    OR (payload_xml IS NULL AND payload_escpos IS NOT NULL)
  );
