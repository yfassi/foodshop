// Epson Server Direct Print poll endpoint.
//
// The printer is configured (in its own web admin) to POST this URL every few
// seconds. The URL carries a per-printer token (?token=...) — the printer is
// not a browser and has no session, so the token is the only credential.
//
// Public route, like the Stripe webhook: no auth cookie. Security rests
// entirely on the token. runtime=nodejs because we use the crypto module
// inside poll-helpers.

import { createAdminClient } from "@/lib/supabase/admin";
import { parseSdpResult, wrapSdpResponse } from "@/lib/print/sdp";
import {
  authenticatePrinter,
  claimNextJob,
  hasJobInFlight,
  heartbeat,
  markJob,
  requeueStaleJobs,
} from "@/lib/print/poll-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function xml(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

// Empty 200 — SDP's "nothing to print, keep polling".
const noJob = () => xml("");

export async function POST(request: Request) {
  // --- auth: per-printer token (query param, or X-Printer-Token header) ---
  const url = new URL(request.url);
  const token =
    url.searchParams.get("token") ?? request.headers.get("x-printer-token");

  const supabase = createAdminClient();
  // SDP printers only — a USB token landing here means the cuisine page is
  // pointed at the wrong endpoint, which would just return empty XML forever.
  const printer = await authenticatePrinter(supabase, token, [
    "epson_sdp",
    "star_cloudprnt",
  ]);
  if (!printer) {
    return new Response("Invalid or inactive printer token", { status: 401 });
  }

  // --- parse the SDP form body (application/x-www-form-urlencoded) ---
  const form = new URLSearchParams(await request.text());
  const connectionType = form.get("ConnectionType") ?? "";

  await heartbeat(supabase, printer.id);

  // --- SetResponse: the printer is reporting the result of a print job ---
  if (connectionType === "SetResponse") {
    const { success, code } = parseSdpResult(form.get("ResponseFile") ?? "");
    // One job is in flight at a time (see GetRequest below), so this
    // unambiguously targets the job the printer just finished.
    await markJob(
      supabase,
      printer.id,
      success ? "done" : "error",
      success ? undefined : `printer error code ${code ?? "unknown"}`,
    );
    return noJob();
  }

  // --- GetRequest (default): the printer is polling for work ---
  await requeueStaleJobs(supabase, printer.id);
  if (await hasJobInFlight(supabase, printer.id)) return noJob();

  const job = await claimNextJob(supabase, printer.id);
  if (!job || !job.payload_xml) return noJob();
  return xml(wrapSdpResponse(job.payload_xml));
}
