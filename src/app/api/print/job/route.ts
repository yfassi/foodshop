// On-demand print endpoint — backs the "Imprimer" buttons on the kitchen
// ticket and counter order card. Owner-authenticated; queues a manual print
// job (source='manual', exempt from the auto-job idempotency index, so
// reprints always work).

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Order, PrinterKind } from "@/lib/types";
import { bytesToPgHex } from "@/lib/print/bytea";
import {
  renderCustomerReceiptEscpos,
  renderCustomerReceiptXml,
  renderKitchenTicketEscpos,
  renderKitchenTicketXml,
  type ReceiptRestaurant,
} from "@/lib/print/render-receipt";

interface PrinterRouting {
  id: string;
  kind: PrinterKind;
  auto_print_kitchen: boolean;
  auto_print_receipt: boolean;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const orderId: unknown = body?.order_id;
  const jobType: unknown = body?.job_type;
  if (
    typeof orderId !== "string" ||
    (jobType !== "kitchen" && jobType !== "receipt")
  ) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  // --- auth: caller must own the order's restaurant ---
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single<Order>();
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id, owner_id, name, address, phone")
    .eq("id", order.restaurant_id)
    .single<{
      id: string;
      owner_id: string | null;
      name: string;
      address: string | null;
      phone: string | null;
    }>();
  if (!restaurant || restaurant.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // --- pick target printers ---
  // Route by the auto_print_* toggle that matches the job type; if no printer
  // has that toggle on, fall back to every active printer so a manual click
  // never prints nowhere.
  const { data: printers } = await admin
    .from("printers")
    .select("id, kind, auto_print_kitchen, auto_print_receipt")
    .eq("restaurant_id", restaurant.id)
    .eq("is_active", true)
    .returns<PrinterRouting[]>();
  if (!printers || printers.length === 0) {
    return NextResponse.json(
      { error: "Aucune imprimante configurée" },
      { status: 400 },
    );
  }
  const matching = printers.filter((p) =>
    jobType === "kitchen" ? p.auto_print_kitchen : p.auto_print_receipt,
  );
  const targets = matching.length > 0 ? matching : printers;

  // --- render once per transport (XML vs ESC/POS), queue for each printer ---
  // Both payloads are computed lazily so a kitchen with only WiFi printers
  // never builds ESC/POS bytes (and vice versa).
  const receiptRestaurant: ReceiptRestaurant = {
    name: restaurant.name,
    address: restaurant.address,
    phone: restaurant.phone,
  };

  let payloadXml: string | null = null;
  let payloadEscposHex: string | null = null;
  const ensureXml = () => {
    if (payloadXml === null) {
      payloadXml =
        jobType === "kitchen"
          ? renderKitchenTicketXml(order, receiptRestaurant)
          : renderCustomerReceiptXml(order, receiptRestaurant);
    }
    return payloadXml;
  };
  const ensureEscpos = () => {
    if (payloadEscposHex === null) {
      const bytes =
        jobType === "kitchen"
          ? renderKitchenTicketEscpos(order, receiptRestaurant)
          : renderCustomerReceiptEscpos(order, receiptRestaurant);
      payloadEscposHex = bytesToPgHex(bytes);
    }
    return payloadEscposHex;
  };

  const rows = targets.map((p) => {
    const isUsb = p.kind === "usb_thermal";
    return {
      restaurant_id: restaurant.id,
      printer_id: p.id,
      order_id: order.id,
      job_type: jobType,
      source: "manual" as const,
      payload_xml: isUsb ? null : ensureXml(),
      payload_escpos: isUsb ? ensureEscpos() : null,
    };
  });

  const { error: insertErr } = await admin.from("print_jobs").insert(rows);
  if (insertErr) {
    console.error("[print] manual print job insert failed:", insertErr);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
