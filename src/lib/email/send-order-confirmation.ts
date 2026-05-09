import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/format";
import { OrderConfirmationEmail } from "./order-confirmation-email";
import type { Order } from "@/lib/types";

const FROM_ADDRESS = "TaapR <noreply@taapr.fr>";

let resendClient: Resend | null = null;
function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!resendClient) resendClient = new Resend(apiKey);
  return resendClient;
}

interface SendOrderConfirmationOptions {
  /** UUID of the order in `orders` table */
  orderId: string;
}

interface SendOrderConfirmationResult {
  ok: boolean;
  /** "sent" — sent now. "skipped" — already sent / no email. "disabled" — no API key. "error" — failure (logged). */
  status: "sent" | "skipped" | "disabled" | "error";
  reason?: string;
}

/**
 * Send the customer order confirmation email (idempotent).
 *
 * Loads the order + restaurant, renders the React Email template, and posts
 * via Resend. Sets `confirmation_email_sent_at` on success. Safe to call
 * multiple times — only the first call actually sends.
 *
 * Failures are logged but do not throw, so callers (webhooks etc.) never
 * fail the request because of email issues.
 */
export async function sendOrderConfirmationEmail({
  orderId,
}: SendOrderConfirmationOptions): Promise<SendOrderConfirmationResult> {
  try {
    const resend = getResend();
    if (!resend) {
      console.warn("[email] RESEND_API_KEY missing — confirmation email skipped");
      return { ok: false, status: "disabled" };
    }

    const supabase = createAdminClient();

    // Load order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single<Order & { confirmation_email_sent_at: string | null; restaurant_id: string }>();

    if (orderErr || !order) {
      console.error("[email] order not found:", orderId, orderErr);
      return { ok: false, status: "error", reason: "order-not-found" };
    }

    // Idempotency guard
    if (order.confirmation_email_sent_at) {
      return { ok: true, status: "skipped", reason: "already-sent" };
    }

    // Email is optional — bail silently when none on file
    const recipientEmail = order.customer_info?.email?.trim();
    if (!recipientEmail) {
      return { ok: true, status: "skipped", reason: "no-email" };
    }

    // Load restaurant for name + slug + tracking URL
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("name, slug")
      .eq("id", order.restaurant_id)
      .single<{ name: string; slug: string }>();

    if (!restaurant) {
      console.error("[email] restaurant not found for order:", orderId);
      return { ok: false, status: "error", reason: "restaurant-not-found" };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.taapr.fr";
    const trackingUrl = `${appUrl}/restaurant/${restaurant.slug}/order-confirmation/${order.id}`;

    const orderDate = new Date(order.created_at).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const orderTime = new Date(order.created_at).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const orderTypeLabel =
      order.order_type === "dine_in" ? "Sur place"
      : order.order_type === "takeaway" ? "À emporter"
      : order.order_type === "delivery" ? "Livraison"
      : null;

    const isOnSite =
      order.payment_method === "on_site" && order.payment_source !== "wallet";
    const paymentLabel =
      order.payment_source === "wallet" ? "Solde"
      : isOnSite ? "Sur place"
      : "Carte";

    const items = order.items.map((item) => ({
      quantity: item.quantity,
      name: item.product_name,
      isMenu: item.is_menu,
      modifiers: item.modifiers?.map((m) => m.modifier_name) ?? [],
      lineTotalLabel: formatPrice(item.line_total),
    }));

    const customerFirstName = order.customer_info?.name?.split(" ")[0];
    const orderNumber = order.display_order_number || `#${order.order_number}`;

    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: recipientEmail,
      subject: `Commande ${orderNumber} confirmée chez ${restaurant.name}`,
      react: OrderConfirmationEmail({
        customerFirstName,
        restaurantName: restaurant.name,
        orderNumber,
        orderDate,
        orderTime,
        orderTypeLabel,
        paymentLabel,
        items,
        totalLabel: formatPrice(order.total_price),
        notes: order.customer_info?.notes ?? null,
        trackingUrl,
      }),
    });

    if (error) {
      console.error("[email] resend send failed:", error);
      return { ok: false, status: "error", reason: error.message };
    }

    // Mark as sent so retries don't double-send
    await supabase
      .from("orders")
      .update({ confirmation_email_sent_at: new Date().toISOString() })
      .eq("id", order.id)
      .is("confirmation_email_sent_at", null);

    return { ok: true, status: "sent" };
  } catch (err) {
    console.error("[email] unexpected error:", err);
    return {
      ok: false,
      status: "error",
      reason: err instanceof Error ? err.message : "unknown",
    };
  }
}
