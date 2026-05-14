// Epson Server Direct Print poll endpoint.
//
// The printer is configured (in its own web admin) to POST this URL every few
// seconds. The URL carries a per-printer token (?token=...) — the printer is
// not a browser and has no session, so the token is the only credential.
//
// Public route, like the Stripe webhook: no auth cookie. Security rests
// entirely on the token. runtime=nodejs because we use the crypto module.

import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PrintJob } from "@/lib/types";
import { parseSdpResult, wrapSdpResponse } from "@/lib/print/sdp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A job stuck in 'printing' longer than this is assumed lost (the printer's
// SetResponse never arrived) and gets requeued on the next poll.
const STALE_JOB_MINUTES = 2;

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
  if (!token) {
    return new Response("Missing printer token", { status: 401 });
  }
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const supabase = createAdminClient();
  const { data: printer } = await supabase
    .from("printers")
    .select("id, is_active")
    .eq("token_hash", tokenHash)
    .single<{ id: string; is_active: boolean }>();

  if (!printer || !printer.is_active) {
    return new Response("Invalid or inactive printer token", { status: 401 });
  }

  // --- parse the SDP form body (application/x-www-form-urlencoded) ---
  const form = new URLSearchParams(await request.text());
  const connectionType = form.get("ConnectionType") ?? "";

  // Heartbeat — any contact means the printer is alive and reachable.
  await supabase
    .from("printers")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", printer.id);

  // --- SetResponse: the printer is reporting the result of a print job ---
  if (connectionType === "SetResponse") {
    const { success, code } = parseSdpResult(form.get("ResponseFile") ?? "");
    // One job is in flight at a time (see GetRequest below), so this
    // unambiguously targets the job the printer just finished.
    await supabase
      .from("print_jobs")
      .update({
        status: success ? "done" : "error",
        printed_at: success ? new Date().toISOString() : null,
        error_message: success ? null : `printer error code ${code ?? "unknown"}`,
      })
      .eq("printer_id", printer.id)
      .eq("status", "printing");
    return noJob();
  }

  // --- GetRequest (default): the printer is polling for work ---

  // 1. Requeue jobs stuck in 'printing' — the printer claimed them but its
  //    SetResponse never arrived. Worst case: one stale job reprints.
  const staleCutoff = new Date(
    Date.now() - STALE_JOB_MINUTES * 60_000,
  ).toISOString();
  await supabase
    .from("print_jobs")
    .update({
      status: "pending",
      claimed_at: null,
      error_message: "requeued: no print result received",
    })
    .eq("printer_id", printer.id)
    .eq("status", "printing")
    .lt("claimed_at", staleCutoff);

  // 2. One job in flight at a time: if something is still 'printing', wait —
  //    this keeps the SetResponse handler unambiguous.
  const { count: inFlight } = await supabase
    .from("print_jobs")
    .select("id", { count: "exact", head: true })
    .eq("printer_id", printer.id)
    .eq("status", "printing");
  if (inFlight && inFlight > 0) {
    return noJob();
  }

  // 3. Atomically claim the next pending job (FOR UPDATE SKIP LOCKED inside
  //    the RPC). Returns null when the queue is empty.
  const { data: job, error } = await supabase.rpc("claim_next_print_job", {
    p_printer_id: printer.id,
  });
  if (error || !job) {
    return noJob();
  }

  return xml(wrapSdpResponse((job as PrintJob).payload_xml));
}
