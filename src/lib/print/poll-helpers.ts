// Shared poll logic between transports (Epson SDP and WebUSB). The two
// endpoints differ only in their wire format — the request preamble (token
// auth, heartbeat, stale-job requeue, atomic claim, in-flight guard) is
// identical and lives here.

import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PrintJob, PrinterKind } from "@/lib/types";

// A job stuck in 'printing' longer than this is assumed lost (the SetResponse
// or POST-completion never arrived) and gets requeued on the next poll.
export const STALE_JOB_MINUTES = 2;

export interface AuthedPrinter {
  id: string;
  kind: PrinterKind;
  is_active: boolean;
}

// Looks up the printer behind a bearer token. Returns null when the token is
// missing, doesn't match, or the printer has been disabled. Both transports
// use the same printers.token_hash column.
export async function authenticatePrinter(
  supabase: SupabaseClient,
  token: string | null,
  expectedKinds?: PrinterKind[],
): Promise<AuthedPrinter | null> {
  if (!token) return null;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const { data: printer } = await supabase
    .from("printers")
    .select("id, kind, is_active")
    .eq("token_hash", tokenHash)
    .single<AuthedPrinter>();
  if (!printer || !printer.is_active) return null;
  if (expectedKinds && !expectedKinds.includes(printer.kind)) return null;
  return printer;
}

// Updates last_seen_at — every poll counts as a heartbeat regardless of
// whether it returned a job. The UI uses this to drive the online/offline
// badge in printer-manager.tsx.
export async function heartbeat(
  supabase: SupabaseClient,
  printerId: string,
): Promise<void> {
  await supabase
    .from("printers")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", printerId);
}

// Requeues jobs that have been 'printing' too long. Worst case: one stale
// job gets reprinted — better than a job that silently never prints.
export async function requeueStaleJobs(
  supabase: SupabaseClient,
  printerId: string,
): Promise<void> {
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
    .eq("printer_id", printerId)
    .eq("status", "printing")
    .lt("claimed_at", staleCutoff);
}

// One job in flight at a time per printer: keeps result reporting unambiguous
// (the only 'printing' row is the job the caller is finishing).
export async function hasJobInFlight(
  supabase: SupabaseClient,
  printerId: string,
): Promise<boolean> {
  const { count } = await supabase
    .from("print_jobs")
    .select("id", { count: "exact", head: true })
    .eq("printer_id", printerId)
    .eq("status", "printing");
  return !!count && count > 0;
}

// Atomic claim — FOR UPDATE SKIP LOCKED inside the RPC. Returns null when the
// queue is empty.
export async function claimNextJob(
  supabase: SupabaseClient,
  printerId: string,
): Promise<PrintJob | null> {
  const { data, error } = await supabase.rpc("claim_next_print_job", {
    p_printer_id: printerId,
  });
  if (error || !data) return null;
  return data as PrintJob;
}

// Marks a job complete. Used by SetResponse (SDP) and the JSON POST (WebUSB).
export async function markJob(
  supabase: SupabaseClient,
  printerId: string,
  status: "done" | "error",
  errorMessage?: string,
  jobId?: string,
): Promise<void> {
  const query = supabase
    .from("print_jobs")
    .update({
      status,
      printed_at: status === "done" ? new Date().toISOString() : null,
      error_message: status === "done" ? null : errorMessage ?? "unknown error",
    })
    .eq("printer_id", printerId)
    .eq("status", "printing");
  // SDP can't echo the job ID, so it relies on the "one in flight" invariant;
  // the WebUSB station echoes it for a tighter guarantee.
  if (jobId) query.eq("id", jobId);
  await query;
}
