"use client";

import { useState, useRef, useEffect } from "react";
import type { Order, OrderStatus } from "@/lib/types";
import { formatTime } from "@/lib/format";
import { ORDER_STATUS_CONFIG } from "@/lib/constants";
import { OrderStatusBadge } from "./order-status-badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Lock, Printer } from "lucide-react";

const EDITABLE_STATUSES: OrderStatus[] = ["new", "preparing", "ready", "done", "cancelled"];

interface KitchenTicketProps {
  order: Order;
  compact?: boolean;
  /** Locked tickets cannot have status changed (e.g. order picked up by client). */
  locked?: boolean;
}

/**
 * Ticket-style card for kitchen view. Narrow, tall, evokes a paper ticket
 * clipped on a kitchen rail. Designed for horizontal scrolling lanes.
 */
export function KitchenTicket({ order, compact = false, locked = false }: KitchenTicketProps) {
  const config = ORDER_STATUS_CONFIG[order.status];
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showStatusPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowStatusPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showStatusPicker]);

  const updateStatus = async (newStatus: OrderStatus) => {
    try {
      const res = await fetch("/api/orders/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: order.id, status: newStatus }),
      });
      if (!res.ok) {
        toast.error("Erreur lors de la mise à jour");
      }
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const printTicket = async () => {
    try {
      const res = await fetch("/api/print/job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: order.id, job_type: "kitchen" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "Erreur lors de l'impression");
      } else {
        toast.success("Ticket envoyé à l'impression");
      }
    } catch {
      toast.error("Erreur lors de l'impression");
    }
  };

  const displayNumber =
    order.display_order_number || `#${order.order_number}`;

  const orderTypeLabel =
    order.order_type === "dine_in" ? "Sur place" :
    order.order_type === "takeaway" ? "À emporter" :
    order.order_type === "delivery" ? "Livraison" :
    null;

  const orderTime = new Date(order.created_at).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const totalItems = order.items.reduce((s, i) => s + i.quantity, 0);

  // Width: tickets stay narrow so multiple line up like clipped slips
  const widthClass = compact ? "w-[240px]" : "w-[280px] md:w-[300px]";

  return (
    <div
      className={`relative ${widthClass} overflow-hidden rounded-lg border border-border bg-white shadow-sm`}
    >
      {/* Top notch — the "clip" of the ticket */}
      <div className="flex h-1.5 items-center justify-center bg-gradient-to-b from-zinc-200 to-zinc-100">
        <div className="h-1 w-12 rounded-full bg-zinc-400/40" />
      </div>

      {/* Header — number + status badge */}
      <div className={`flex items-start justify-between gap-2 px-3.5 pt-3 ${compact ? "pb-1.5" : "pb-2"}`}>
        <div className="min-w-0">
          <p
            className={`font-mono font-black leading-none tracking-tight ${
              compact ? "text-2xl" : "text-3xl"
            }`}
          >
            {displayNumber}
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {orderTime}
            {orderTypeLabel && ` · ${orderTypeLabel}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={printTicket}
            aria-label="Imprimer le ticket"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Printer className="h-3.5 w-3.5" />
          </button>
        <div className="relative" ref={pickerRef}>
          {locked ? (
            <span
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
              title="Commande récupérée — verrouillée"
            >
              <Lock className="h-3 w-3" />
              {ORDER_STATUS_CONFIG[order.status].label}
            </span>
          ) : (
            <>
              <button
                onClick={() => setShowStatusPicker((v) => !v)}
                aria-label="Changer le statut"
              >
                <OrderStatusBadge status={order.status} />
              </button>
              {showStatusPicker && (
                <div className="absolute right-0 top-full z-20 mt-1 rounded-lg border bg-white p-1 shadow-lg">
                  {EDITABLE_STATUSES.filter((s) => s !== order.status).map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        updateStatus(s);
                        setShowStatusPicker(false);
                      }}
                      className={`flex w-full items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted ${ORDER_STATUS_CONFIG[s].color}`}
                    >
                      {ORDER_STATUS_CONFIG[s].label}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        </div>
      </div>

      {/* Pickup time */}
      {order.pickup_time && (
        <p className="px-3.5 pb-1.5 text-[11px] font-semibold text-muted-foreground">
          Retrait : {formatTime(order.pickup_time)}
        </p>
      )}

      {/* Dashed separator */}
      <div className="mx-3.5 border-t border-dashed border-zinc-300" />

      {/* Items — late additions (added_at) get a green badge + side bar */}
      <div className={`px-3.5 pt-2.5 ${compact ? "pb-2.5" : "pb-3"}`}>
        <ul className={compact ? "space-y-1" : "space-y-1.5"}>
          {order.items.map((item, i) => (
            <li
              key={i}
              className={
                item.added_at
                  ? "-mx-1 rounded border-l-4 border-emerald-500 bg-emerald-50 px-1.5 py-0.5"
                  : ""
              }
            >
              <p className={`font-semibold leading-snug ${compact ? "text-sm" : "text-base"}`}>
                <span className="mr-1 font-mono text-primary">{item.quantity}×</span>
                {item.product_name}
                {item.is_menu && (
                  <span className="ml-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    (menu)
                  </span>
                )}
                {item.added_at && (
                  <span className="ml-1.5 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                    Ajouté
                  </span>
                )}
              </p>
              {item.modifiers.length > 0 && (
                <p className="ml-5 text-[11px] italic leading-snug text-muted-foreground">
                  {item.modifiers.map((m) => m.modifier_name).join(", ")}
                </p>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {totalItems} article{totalItems > 1 ? "s" : ""}
        </p>
      </div>

      {/* Note from customer */}
      {order.customer_info?.notes && (
        <div className="mx-3.5 mb-2 rounded border border-dashed border-amber-300 bg-amber-50 px-2 py-1.5 text-[11px] italic text-amber-900">
          {order.customer_info.notes}
        </div>
      )}

      {/* Action footer */}
      {!locked && config.nextStatus && config.nextStatus !== "done" && !compact && (
        <div className="border-t border-dashed border-zinc-300 bg-zinc-50/60 px-3 py-2.5">
          <Button
            onClick={() => updateStatus(config.nextStatus!)}
            className="h-11 w-full rounded-lg text-sm font-bold"
          >
            {config.nextLabel}
          </Button>
        </div>
      )}
      {!locked && compact && config.nextStatus && (
        <div className="border-t border-dashed border-zinc-300 bg-zinc-50/60 px-3 py-2">
          <Button
            onClick={() => updateStatus(config.nextStatus!)}
            variant="outline"
            className="h-9 w-full rounded-lg text-xs font-semibold"
          >
            {config.nextLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
