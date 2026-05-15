// Test-print endpoint — backs the "Imprimer un test" button in settings.
// Queues a tiny test ticket so the owner can confirm a printer is wired up
// without needing a real order.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bytesToPgHex } from "@/lib/print/bytea";
import {
  renderTestTicketEscpos,
  renderTestTicketXml,
} from "@/lib/print/render-receipt";
import type { PrinterKind } from "@/lib/types";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const printerId: unknown = body?.printer_id;
  if (typeof printerId !== "string") {
    return NextResponse.json({ error: "printer_id requis" }, { status: 400 });
  }

  // RLS on `printers` scopes SELECT to the owner — a non-owner gets no row.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: printer } = await supabase
    .from("printers")
    .select("id, restaurant_id, is_active, kind")
    .eq("id", printerId)
    .single<{
      id: string;
      restaurant_id: string;
      is_active: boolean;
      kind: PrinterKind;
    }>();
  if (!printer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("name, address, phone")
    .eq("id", printer.restaurant_id)
    .single<{ name: string; address: string | null; phone: string | null }>();
  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant introuvable" }, { status: 404 });
  }

  const isUsb = printer.kind === "usb_thermal";
  // print_jobs has no client INSERT policy — write through the service role.
  const admin = createAdminClient();
  const { error } = await admin.from("print_jobs").insert({
    restaurant_id: printer.restaurant_id,
    printer_id: printer.id,
    order_id: null,
    job_type: "test",
    source: "manual",
    payload_xml: isUsb ? null : renderTestTicketXml(restaurant),
    payload_escpos: isUsb
      ? bytesToPgHex(renderTestTicketEscpos(restaurant))
      : null,
  });

  if (error) {
    console.error("[printers] test print insert failed:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
