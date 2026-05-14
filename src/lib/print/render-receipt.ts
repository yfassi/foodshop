// Renders an Order into ePOS-Print XML for thermal printers.
// - renderKitchenTicketXml: large, no prices — what the kitchen needs to cook.
// - renderCustomerReceiptXml: priced receipt — mirrors the confirmation email.
// - renderTestTicketXml: a tiny "is it wired up?" ticket for the settings page.
//
// Content mirrors src/components/orders/kitchen-ticket.tsx and
// src/lib/email/send-order-confirmation.ts. Times are forced to Europe/Paris so
// printed tickets show correct local time regardless of server timezone.

import { formatPrice } from "@/lib/format";
import type { Order } from "@/lib/types";
import { cut, eposDocument, feed, line, row, text } from "./epos";

export interface ReceiptRestaurant {
  name: string;
  address?: string | null;
  phone?: string | null;
}

const TZ = "Europe/Paris";

function parisDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    timeZone: TZ,
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function parisTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
}

function orderTypeLabel(order: Order): string | null {
  return order.order_type === "dine_in"
    ? "Sur place"
    : order.order_type === "takeaway"
      ? "À emporter"
      : order.order_type === "delivery"
        ? "Livraison"
        : null;
}

function paymentLabel(order: Order): string {
  const isOnSite =
    order.payment_method === "on_site" && order.payment_source !== "wallet";
  return order.payment_source === "wallet"
    ? "Solde"
    : isOnSite
      ? "Sur place"
      : "Carte";
}

function displayNumber(order: Order): string {
  return order.display_order_number || `#${order.order_number}`;
}

/**
 * Kitchen ticket — what the line cooks read. Big order number, no prices,
 * mirrors the on-screen kitchen-ticket.tsx card.
 */
export function renderKitchenTicketXml(
  order: Order,
  restaurant: ReceiptRestaurant,
): string {
  const parts: string[] = [];
  const typeLabel = orderTypeLabel(order);

  parts.push(text(restaurant.name, { align: "center" }));
  parts.push(line("="));
  parts.push(
    text(displayNumber(order), {
      align: "center",
      em: true,
      width: 2,
      height: 2,
    }),
  );
  parts.push(
    text(
      parisTime(order.created_at) + (typeLabel ? ` · ${typeLabel}` : ""),
      { align: "center" },
    ),
  );
  if (order.pickup_time) {
    parts.push(text(`Retrait : ${parisTime(order.pickup_time)}`, { align: "center", em: true }));
  }
  if (order.pager_number) {
    parts.push(text(`Bipper : ${order.pager_number}`, { align: "center", em: true }));
  }
  parts.push(line("-"));

  for (const item of order.items) {
    const tags = [
      item.is_menu ? " (menu)" : "",
      item.added_at ? " [AJOUTÉ]" : "",
    ].join("");
    parts.push(text(`${item.quantity}x ${item.product_name}${tags}`, { em: true }));
    if (item.modifiers.length > 0) {
      parts.push(text(`  ${item.modifiers.map((m) => m.modifier_name).join(", ")}`));
    }
  }

  const totalItems = order.items.reduce((s, i) => s + i.quantity, 0);
  parts.push(line("-"));
  parts.push(text(`${totalItems} article${totalItems > 1 ? "s" : ""}`));

  if (order.customer_info?.notes) {
    parts.push(line("-"));
    parts.push(text("NOTE CLIENT", { em: true }));
    parts.push(text(order.customer_info.notes));
  }

  if (order.order_type === "delivery" && order.delivery_address) {
    parts.push(line("-"));
    parts.push(text("LIVRAISON", { em: true }));
    parts.push(text(order.delivery_address.formatted));
    if (order.delivery_address.floor_notes) {
      parts.push(text(order.delivery_address.floor_notes));
    }
  }

  parts.push(feed(3));
  parts.push(cut());
  return eposDocument(...parts);
}

/**
 * Customer receipt — priced "ticket de caisse". Mirrors the confirmation email.
 */
export function renderCustomerReceiptXml(
  order: Order,
  restaurant: ReceiptRestaurant,
): string {
  const parts: string[] = [];
  const typeLabel = orderTypeLabel(order);

  parts.push(text(restaurant.name, { align: "center", em: true, width: 2, height: 2 }));
  if (restaurant.address) {
    parts.push(text(restaurant.address, { align: "center" }));
  }
  if (restaurant.phone) {
    parts.push(text(restaurant.phone, { align: "center" }));
  }
  parts.push(line("="));

  parts.push(text("Ticket de caisse", { align: "center" }));
  parts.push(text(parisDate(order.created_at), { align: "center" }));
  parts.push(line("-"));

  parts.push(text("Commande", { align: "center" }));
  parts.push(
    text(displayNumber(order), { align: "center", em: true, width: 2, height: 2 }),
  );
  parts.push(line("-"));

  if (typeLabel) parts.push(row("Type", typeLabel));
  parts.push(row("Heure", parisTime(order.created_at)));
  parts.push(row("Paiement", paymentLabel(order)));
  parts.push(line("-"));

  for (const item of order.items) {
    const name = `${item.quantity}x ${item.product_name}${item.is_menu ? " (menu)" : ""}`;
    parts.push(row(name, formatPrice(item.line_total)));
    if (item.modifiers.length > 0) {
      parts.push(text(`  ${item.modifiers.map((m) => m.modifier_name).join(", ")}`));
    }
  }
  parts.push(line("-"));

  if (order.delivery_fee && order.delivery_fee > 0) {
    parts.push(row("Livraison", formatPrice(order.delivery_fee)));
  }
  if (order.delivery_tip && order.delivery_tip > 0) {
    parts.push(row("Pourboire", formatPrice(order.delivery_tip)));
  }
  parts.push(row("TOTAL", formatPrice(order.total_price), { em: true }));
  parts.push(line("-"));

  if (order.customer_info?.notes) {
    parts.push(text(order.customer_info.notes));
    parts.push(line("-"));
  }

  parts.push(feed(1));
  parts.push(text("À très vite !", { align: "center" }));
  parts.push(text("Propulsé par TaapR", { align: "center" }));
  parts.push(feed(3));
  parts.push(cut());
  return eposDocument(...parts);
}

/**
 * Tiny ticket for the "test print" button in settings — confirms the printer
 * is wired up without needing a real order.
 */
export function renderTestTicketXml(restaurant: ReceiptRestaurant): string {
  const now = new Date();
  return eposDocument(
    line("="),
    text("TEST D'IMPRESSION", { align: "center", em: true }),
    text(restaurant.name, { align: "center" }),
    text(
      `${now.toLocaleDateString("fr-FR", { timeZone: TZ })} ${now.toLocaleTimeString("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" })}`,
      { align: "center" },
    ),
    line("="),
    feed(1),
    text("Si vous lisez ce ticket,", { align: "center" }),
    text("l'imprimante est bien", { align: "center" }),
    text("configurée.", { align: "center" }),
    feed(3),
    cut(),
  );
}
