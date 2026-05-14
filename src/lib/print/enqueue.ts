// Turns "an order just became paid" into queued print jobs.
//
// Called fire-and-forget (`void enqueueOrderPrintJobs(orderId)`) from every
// place an order flips to paid: the Stripe webhook, the wallet full-payment
// path, the on-site mark-paid endpoint, and the order-confirmation fallback.
// Idempotent (the uq_print_jobs_order_type partial unique index rejects
// duplicate auto jobs) and never throws — callers are webhooks and must not
// fail because of printing. Models src/lib/email/send-order-confirmation.ts.

import { createAdminClient } from "@/lib/supabase/admin";
import type { Order } from "@/lib/types";
import {
  renderCustomerReceiptXml,
  renderKitchenTicketXml,
  type ReceiptRestaurant,
} from "./render-receipt";

interface AutoPrinter {
  id: string;
  auto_print_kitchen: boolean;
  auto_print_receipt: boolean;
}

export async function enqueueOrderPrintJobs(orderId: string): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single<Order>();

    if (orderErr || !order) {
      console.error("[print] order not found for enqueue:", orderId, orderErr);
      return;
    }

    const { data: printers, error: printersErr } = await supabase
      .from("printers")
      .select("id, auto_print_kitchen, auto_print_receipt")
      .eq("restaurant_id", order.restaurant_id)
      .eq("is_active", true)
      .returns<AutoPrinter[]>();

    if (printersErr) {
      console.error("[print] failed to load printers:", printersErr);
      return;
    }
    // Restaurant has no printer configured — nothing to do, not an error.
    if (!printers || printers.length === 0) return;

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("name, address, phone")
      .eq("id", order.restaurant_id)
      .single<ReceiptRestaurant>();

    if (!restaurant) {
      console.error("[print] restaurant not found for order:", orderId);
      return;
    }

    type JobRow = {
      restaurant_id: string;
      printer_id: string;
      order_id: string;
      job_type: "kitchen" | "receipt";
      source: "auto";
      payload_xml: string;
    };
    const rows: JobRow[] = [];

    for (const printer of printers) {
      if (printer.auto_print_kitchen) {
        rows.push({
          restaurant_id: order.restaurant_id,
          printer_id: printer.id,
          order_id: order.id,
          job_type: "kitchen",
          source: "auto",
          payload_xml: renderKitchenTicketXml(order, restaurant),
        });
      }
      if (printer.auto_print_receipt) {
        rows.push({
          restaurant_id: order.restaurant_id,
          printer_id: printer.id,
          order_id: order.id,
          job_type: "receipt",
          source: "auto",
          payload_xml: renderCustomerReceiptXml(order, restaurant),
        });
      }
    }

    // Insert one row at a time: a duplicate (23505, from a webhook retry) on one
    // job must not block a genuinely new job for another printer.
    for (const row of rows) {
      const { error } = await supabase.from("print_jobs").insert(row);
      if (error && error.code !== "23505") {
        console.error("[print] failed to enqueue print job:", error);
      }
    }
  } catch (err) {
    console.error("[print] unexpected error enqueuing print jobs:", err);
  }
}
