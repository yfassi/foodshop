import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderConfirmationEmail } from "@/lib/email/send-order-confirmation";
import { enqueueOrderPrintJobs } from "@/lib/print/enqueue";

/**
 * Mark an on-site order as paid (counter / "Encaisser" action).
 *
 * Triggers the customer confirmation email — Stripe-paid orders go through
 * the webhook instead.
 */
export async function POST(request: Request) {
  try {
    const { order_id } = (await request.json()) as { order_id?: string };
    if (!order_id) {
      return NextResponse.json({ error: "order_id requis" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify order exists and isn't already paid (idempotency)
    const { data: order } = await supabase
      .from("orders")
      .select("id, paid, payment_method")
      .eq("id", order_id)
      .single<{ id: string; paid: boolean; payment_method: string }>();

    if (!order) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }

    if (!order.paid) {
      const { error } = await supabase
        .from("orders")
        .update({ paid: true })
        .eq("id", order_id);

      if (error) {
        console.error("[mark-paid] update failed:", error);
        return NextResponse.json(
          { error: "Erreur lors de l'encaissement" },
          { status: 500 }
        );
      }
    }

    // Fire-and-forget email (idempotent — won't double-send if already done)
    void sendOrderConfirmationEmail({ orderId: order_id });
    // Fire-and-forget print jobs (idempotent)
    void enqueueOrderPrintJobs(order_id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[mark-paid] error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
