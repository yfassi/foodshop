// WebUSB poll endpoint for USB thermal printers (kind='usb_thermal').
//
// The cuisine page (admin/[publicId]/page.tsx) runs a small in-browser station
// that authenticates with each USB printer's token, polls this endpoint for
// pending jobs, writes the ESC/POS bytes to the device via WebUSB
// transferOut(), then POSTs back the result. Same auth and queue semantics as
// the SDP path — only the wire format differs: JSON instead of SDP XML, and
// raw bytes (base64 over the wire) instead of ePOS XML.
//
// Public route (no cookie), like /api/print/poll: security rests on the
// per-printer token. runtime=nodejs for the crypto module used by the shared
// auth helper.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pgHexToBytes } from "@/lib/print/bytea";
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

function readToken(request: Request): string | null {
  const url = new URL(request.url);
  return (
    url.searchParams.get("token") ?? request.headers.get("x-printer-token")
  );
}

// GET — station polling for a job. Empty (204) means "nothing to print".
export async function GET(request: Request) {
  const supabase = createAdminClient();
  const printer = await authenticatePrinter(supabase, readToken(request), [
    "usb_thermal",
  ]);
  if (!printer) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await heartbeat(supabase, printer.id);
  await requeueStaleJobs(supabase, printer.id);
  if (await hasJobInFlight(supabase, printer.id)) {
    return new Response(null, { status: 204 });
  }

  const job = await claimNextJob(supabase, printer.id);
  if (!job || !job.payload_escpos) {
    return new Response(null, { status: 204 });
  }

  // BYTEA comes back as a "\\x..." hex string. Convert to base64 so the JSON
  // is compact and the client can Uint8Array.from(atob(...)) directly.
  const bytes = pgHexToBytes(job.payload_escpos);
  const b64 = Buffer.from(bytes).toString("base64");

  return NextResponse.json({
    job_id: job.id,
    job_type: job.job_type,
    payload_b64: b64,
  });
}

// POST — station reporting a job result. Body: { job_id, status, error? }.
export async function POST(request: Request) {
  const supabase = createAdminClient();
  const printer = await authenticatePrinter(supabase, readToken(request), [
    "usb_thermal",
  ]);
  if (!printer) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const jobId = body?.job_id;
  const status = body?.status;
  if (
    typeof jobId !== "string" ||
    (status !== "done" && status !== "error")
  ) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const errorMessage =
    typeof body?.error === "string" ? body.error.slice(0, 500) : undefined;

  await heartbeat(supabase, printer.id);
  await markJob(supabase, printer.id, status, errorMessage, jobId);
  return NextResponse.json({ ok: true });
}
