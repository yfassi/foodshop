import { createAdminClient } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/format";
import type { OrderItem } from "@/lib/types";

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    c === "&"
      ? "&amp;"
      : c === "<"
        ? "&lt;"
        : c === ">"
          ? "&gt;"
          : c === '"'
            ? "&quot;"
            : "&#39;"
  );

function renderHtml(params: {
  restaurantName: string;
  orderNumber: string;
  items: OrderItem[];
  total: number;
  deliveryFee: number | null;
  paymentLabel: string;
  orderUrl: string;
}): string {
  const { restaurantName, orderNumber, items, total, deliveryFee, paymentLabel, orderUrl } = params;

  const rows = items
    .map((item) => {
      const mods = item.modifiers.map((m) => m.modifier_name).filter(Boolean);
      const modsLine = mods.length
        ? `<div style="font-size:12px;color:#666;margin-top:2px;">${escapeHtml(mods.join(" · "))}</div>`
        : "";
      const menuTag = item.is_menu
        ? ` <span style="background:#FEF3C7;color:#92400E;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;margin-left:4px;">MENU</span>`
        : "";
      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #eee;">
            <div style="font-size:14px;color:#111;"><strong>${item.quantity}×</strong> ${escapeHtml(item.product_name)}${menuTag}</div>
            ${modsLine}
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;font-family:ui-monospace,Menlo,monospace;font-size:14px;color:#111;white-space:nowrap;">
            ${escapeHtml(formatPrice(item.line_total))}
          </td>
        </tr>`;
    })
    .join("");

  const deliveryRow =
    deliveryFee && deliveryFee > 0
      ? `<tr>
           <td style="padding:8px 0;font-size:13px;color:#666;">Frais de livraison</td>
           <td style="padding:8px 0;text-align:right;font-family:ui-monospace,Menlo,monospace;font-size:13px;color:#666;">${escapeHtml(formatPrice(deliveryFee))}</td>
         </tr>`
      : "";

  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Confirmation de commande</title></head>
<body style="margin:0;padding:0;background:#f6f6f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <tr><td style="padding:28px 28px 8px;">
          <p style="margin:0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#888;font-family:ui-monospace,Menlo,monospace;">${escapeHtml(restaurantName)}</p>
          <h1 style="margin:8px 0 0;font-size:22px;font-weight:800;line-height:1.2;">Merci pour votre commande !</h1>
          <p style="margin:8px 0 0;font-size:14px;color:#444;">Votre numéro de commande&nbsp;:
            <strong style="font-family:ui-monospace,Menlo,monospace;">${escapeHtml(orderNumber)}</strong>
          </p>
        </td></tr>

        <tr><td style="padding:16px 28px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${rows}
            ${deliveryRow}
          </table>
        </td></tr>

        <tr><td style="padding:8px 28px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #111;margin-top:8px;">
            <tr>
              <td style="padding:14px 0 0;font-size:15px;font-weight:700;">Total</td>
              <td style="padding:14px 0 0;text-align:right;font-family:ui-monospace,Menlo,monospace;font-size:15px;font-weight:700;">${escapeHtml(formatPrice(total))}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding:6px 0 0;font-size:12px;color:#666;">${escapeHtml(paymentLabel)}</td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding:24px 28px 28px;">
          <a href="${escapeHtml(orderUrl)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 18px;border-radius:999px;">Suivre ma commande</a>
          <p style="margin:16px 0 0;font-size:12px;color:#888;">Ce mail vous est envoyé par TaapR pour le compte de ${escapeHtml(restaurantName)}.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function paymentLabel(payment_method: string, payment_source: string): string {
  if (payment_source === "wallet") return "Payé avec votre solde";
  if (payment_method === "online") return "Payé en ligne";
  return "À régler sur place";
}

export async function sendOrderConfirmationEmail(orderId: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return;

  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, display_order_number, order_number, items, total_price, payment_method, payment_source, customer_info, restaurant_id, delivery_fee"
    )
    .eq("id", orderId)
    .single();

  if (!order) return;

  const customerInfo = (order.customer_info || {}) as Record<string, string>;
  const to = customerInfo.email;
  if (!to) return;

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("name, slug")
    .eq("id", order.restaurant_id)
    .single();

  if (!restaurant) return;

  const orderNumber =
    order.display_order_number || `#${String(order.order_number).padStart(3, "0")}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://taapr.app";
  const orderUrl = `${appUrl}/restaurant/${restaurant.slug}/order-confirmation/${order.id}`;

  const html = renderHtml({
    restaurantName: restaurant.name,
    orderNumber,
    items: (order.items as OrderItem[]) || [],
    total: order.total_price,
    deliveryFee: order.delivery_fee,
    paymentLabel: paymentLabel(order.payment_method, order.payment_source),
    orderUrl,
  });

  const subject = `Commande ${orderNumber} confirmée — ${restaurant.name}`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error("Resend send failed:", res.status, errBody);
  }
}
