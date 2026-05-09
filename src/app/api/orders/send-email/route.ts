import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderConfirmationEmail } from "@/lib/email/send-order-confirmation";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Customer-initiated send of the receipt email from the order confirmation page.
 *
 * Called when the order had no email on file at checkout. Updates
 * customer_info.email then triggers the (idempotent) confirmation email.
 * Refuses if an email was already sent.
 */
export async function POST(request: Request) {
  try {
    const { order_id, email } = (await request.json()) as {
      order_id?: string;
      email?: string;
    };

    if (!order_id || !email) {
      return NextResponse.json(
        { error: "Données manquantes" },
        { status: 400 }
      );
    }

    const cleaned = email.trim().toLowerCase();
    if (cleaned.length > 254 || !EMAIL_RE.test(cleaned)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: order } = await supabase
      .from("orders")
      .select("id, customer_info, paid, confirmation_email_sent_at")
      .eq("id", order_id)
      .single<{
        id: string;
        customer_info: Record<string, string> | null;
        paid: boolean;
        confirmation_email_sent_at: string | null;
      }>();

    if (!order) {
      return NextResponse.json(
        { error: "Commande introuvable" },
        { status: 404 }
      );
    }

    if (order.confirmation_email_sent_at) {
      return NextResponse.json(
        { error: "Le ticket a déjà été envoyé par email" },
        { status: 409 }
      );
    }

    const updatedCustomerInfo = {
      ...(order.customer_info ?? {}),
      email: cleaned,
    };

    const { error: updateErr } = await supabase
      .from("orders")
      .update({ customer_info: updatedCustomerInfo })
      .eq("id", order_id);

    if (updateErr) {
      console.error("[send-email] update customer_info failed:", updateErr);
      return NextResponse.json(
        { error: "Erreur lors de l'enregistrement" },
        { status: 500 }
      );
    }

    const result = await sendOrderConfirmationEmail({ orderId: order_id });
    if (!result.ok && result.status === "error") {
      return NextResponse.json(
        { error: "Erreur lors de l'envoi de l'email" },
        { status: 500 }
      );
    }
    if (result.status === "disabled") {
      return NextResponse.json(
        { error: "Service email indisponible" },
        { status: 503 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[send-email] error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
