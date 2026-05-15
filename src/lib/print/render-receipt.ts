// Renders an Order into a printable ticket. Layout is defined once against the
// PrintBuilder interface and emitted as either ePOS-Print XML (WiFi printers,
// SDP transport) or raw ESC/POS bytes (USB printers, WebUSB transport).
//
// - render*Xml(): ePOS XML string, queued in print_jobs.payload_xml.
// - render*Escpos(): ESC/POS Uint8Array, queued in print_jobs.payload_escpos.
//
// Content mirrors src/components/orders/kitchen-ticket.tsx and
// src/lib/email/send-order-confirmation.ts. Times are forced to Europe/Paris so
// printed tickets show correct local time regardless of server timezone.

import { formatPrice } from "@/lib/format";
import type { Order } from "@/lib/types";
import type { PrintBuilder } from "./builder";
import { EposBuilder } from "./epos";
import { EscposBuilder } from "./escpos";

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

// --- Format-agnostic layouts: write to the builder, payload is materialized
// by the caller via b.finalize(). ---

function buildKitchenTicket<T>(
  b: PrintBuilder<T>,
  order: Order,
  restaurant: ReceiptRestaurant,
): void {
  const typeLabel = orderTypeLabel(order);

  b.text(restaurant.name, { align: "center" });
  b.line("=");
  b.text(displayNumber(order), {
    align: "center",
    em: true,
    width: 2,
    height: 2,
  });
  b.text(parisTime(order.created_at) + (typeLabel ? ` · ${typeLabel}` : ""), {
    align: "center",
  });
  if (order.pickup_time) {
    b.text(`Retrait : ${parisTime(order.pickup_time)}`, {
      align: "center",
      em: true,
    });
  }
  if (order.pager_number) {
    b.text(`Bipper : ${order.pager_number}`, { align: "center", em: true });
  }
  b.line("-");

  for (const item of order.items) {
    const tags = [
      item.is_menu ? " (menu)" : "",
      item.added_at ? " [AJOUTÉ]" : "",
    ].join("");
    b.text(`${item.quantity}x ${item.product_name}${tags}`, { em: true });
    if (item.modifiers.length > 0) {
      b.text(`  ${item.modifiers.map((m) => m.modifier_name).join(", ")}`);
    }
  }

  const totalItems = order.items.reduce((s, i) => s + i.quantity, 0);
  b.line("-");
  b.text(`${totalItems} article${totalItems > 1 ? "s" : ""}`);

  if (order.customer_info?.notes) {
    b.line("-");
    b.text("NOTE CLIENT", { em: true });
    b.text(order.customer_info.notes);
  }

  if (order.order_type === "delivery" && order.delivery_address) {
    b.line("-");
    b.text("LIVRAISON", { em: true });
    b.text(order.delivery_address.formatted);
    if (order.delivery_address.floor_notes) {
      b.text(order.delivery_address.floor_notes);
    }
  }

  b.feed(3);
  b.cut();
}

function buildCustomerReceipt<T>(
  b: PrintBuilder<T>,
  order: Order,
  restaurant: ReceiptRestaurant,
): void {
  const typeLabel = orderTypeLabel(order);

  b.text(restaurant.name, { align: "center", em: true, width: 2, height: 2 });
  if (restaurant.address) {
    b.text(restaurant.address, { align: "center" });
  }
  if (restaurant.phone) {
    b.text(restaurant.phone, { align: "center" });
  }
  b.line("=");

  b.text("Ticket de caisse", { align: "center" });
  b.text(parisDate(order.created_at), { align: "center" });
  b.line("-");

  b.text("Commande", { align: "center" });
  b.text(displayNumber(order), {
    align: "center",
    em: true,
    width: 2,
    height: 2,
  });
  b.line("-");

  if (typeLabel) b.row("Type", typeLabel);
  b.row("Heure", parisTime(order.created_at));
  b.row("Paiement", paymentLabel(order));
  b.line("-");

  for (const item of order.items) {
    const name = `${item.quantity}x ${item.product_name}${item.is_menu ? " (menu)" : ""}`;
    b.row(name, formatPrice(item.line_total));
    if (item.modifiers.length > 0) {
      b.text(`  ${item.modifiers.map((m) => m.modifier_name).join(", ")}`);
    }
  }
  b.line("-");

  if (order.delivery_fee && order.delivery_fee > 0) {
    b.row("Livraison", formatPrice(order.delivery_fee));
  }
  if (order.delivery_tip && order.delivery_tip > 0) {
    b.row("Pourboire", formatPrice(order.delivery_tip));
  }
  b.row("TOTAL", formatPrice(order.total_price), { em: true });
  b.line("-");

  if (order.customer_info?.notes) {
    b.text(order.customer_info.notes);
    b.line("-");
  }

  b.feed(1);
  b.text("À très vite !", { align: "center" });
  b.text("Propulsé par TaapR", { align: "center" });
  b.feed(3);
  b.cut();
}

function buildTestTicket<T>(
  b: PrintBuilder<T>,
  restaurant: ReceiptRestaurant,
): void {
  const now = new Date();
  b.line("=");
  b.text("TEST D'IMPRESSION", { align: "center", em: true });
  b.text(restaurant.name, { align: "center" });
  b.text(
    `${now.toLocaleDateString("fr-FR", { timeZone: TZ })} ${now.toLocaleTimeString("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" })}`,
    { align: "center" },
  );
  b.line("=");
  b.feed(1);
  b.text("Si vous lisez ce ticket,", { align: "center" });
  b.text("l'imprimante est bien", { align: "center" });
  b.text("configurée.", { align: "center" });
  b.feed(3);
  b.cut();
}

// --- Public API: one renderer per (ticket type, transport) pair. ---

export function renderKitchenTicketXml(
  order: Order,
  restaurant: ReceiptRestaurant,
): string {
  const b = new EposBuilder();
  buildKitchenTicket(b, order, restaurant);
  return b.finalize();
}

export function renderCustomerReceiptXml(
  order: Order,
  restaurant: ReceiptRestaurant,
): string {
  const b = new EposBuilder();
  buildCustomerReceipt(b, order, restaurant);
  return b.finalize();
}

export function renderTestTicketXml(restaurant: ReceiptRestaurant): string {
  const b = new EposBuilder();
  buildTestTicket(b, restaurant);
  return b.finalize();
}

export function renderKitchenTicketEscpos(
  order: Order,
  restaurant: ReceiptRestaurant,
): Uint8Array {
  const b = new EscposBuilder();
  buildKitchenTicket(b, order, restaurant);
  return b.finalize();
}

export function renderCustomerReceiptEscpos(
  order: Order,
  restaurant: ReceiptRestaurant,
): Uint8Array {
  const b = new EscposBuilder();
  buildCustomerReceipt(b, order, restaurant);
  return b.finalize();
}

export function renderTestTicketEscpos(restaurant: ReceiptRestaurant): Uint8Array {
  const b = new EscposBuilder();
  buildTestTicket(b, restaurant);
  return b.finalize();
}
