"use client";

import { useState, useRef, useEffect } from "react";
import type { Order, OrderStatus, OrderView } from "@/lib/types";
import { formatPrice, formatTime } from "@/lib/format";
import { ORDER_STATUS_CONFIG } from "@/lib/constants";
import { OrderStatusBadge } from "./order-status-badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { CreditCard, Banknote, Wallet } from "lucide-react";

const EDITABLE_STATUSES: OrderStatus[] = ["new", "preparing", "ready", "done", "cancelled"];

interface OrderCardProps {
  order: Order;
  view?: OrderView;
}

export function OrderCard({ order, view = "comptoir" }: OrderCardProps) {
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
    const supabase = createClient();
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", order.id);

    if (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const markAsPaid = async () => {
    const supabase = createClient();
    const { error } = await supabase
      .from("orders")
      .update({ paid: true })
      .eq("id", order.id);

    if (error) {
      toast.error("Erreur lors de l'encaissement");
    }
  };

  const isUnpaidOnSite = !order.paid && order.payment_method === "on_site";

  const displayNumber =
    order.display_order_number || `#${order.order_number}`;

  const orderTypeLabel =
    order.order_type === "dine_in" ? "Sur place" :
    order.order_type === "takeaway" ? "À emporter" :
    null;

  // ─── Kitchen view ───
  if (view === "cuisine") {
    return (
      <div className={`rounded-xl p-5 ${config.bgClass}`}>
        {/* Header */}
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="text-3xl font-black leading-tight">
              {displayNumber}
            </p>
            {orderTypeLabel && (
              <span className="mt-1 inline-block rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {orderTypeLabel}
              </span>
            )}
          </div>
          <div className="relative" ref={pickerRef}>
            <button onClick={() => setShowStatusPicker((v) => !v)}>
              <OrderStatusBadge status={order.status} />
            </button>
            {showStatusPicker && (
              <div className="absolute right-0 top-full z-10 mt-1 rounded-lg border bg-white p-1 shadow-lg">
                {EDITABLE_STATUSES.filter((s) => s !== order.status).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      updateStatus(s);
                      setShowStatusPicker(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted ${ORDER_STATUS_CONFIG[s].color}`}
                  >
                    {ORDER_STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pickup time */}
        {order.pickup_time && (
          <p className="mb-3 text-sm font-semibold text-muted-foreground">
            Retrait : {formatTime(order.pickup_time)}
          </p>
        )}

        {/* Items — big and prominent */}
        <div className="mb-4 space-y-2">
          {order.items.map((item, i) => (
            <div key={i}>
              <p className="text-lg font-bold">
                {item.quantity}x {item.product_name}
                {item.is_menu && (
                  <span className="ml-1 text-sm font-semibold text-primary">(Menu)</span>
                )}
              </p>
              {item.modifiers.length > 0 && (
                <p className="ml-6 text-sm font-medium text-muted-foreground">
                  {item.modifiers.map((m) => m.modifier_name).join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Action button (kitchen stops at "ready", not "done") */}
        {config.nextStatus && config.nextStatus !== "done" && (
          <Button
            onClick={() => updateStatus(config.nextStatus!)}
            className="h-14 w-full rounded-xl text-base font-bold"
            size="lg"
          >
            {config.nextLabel}
          </Button>
        )}
      </div>
    );
  }

  // ─── Counter view (default) ───
  const paymentIcon =
    order.payment_source === "wallet" ? (
      <>
        <Wallet className="h-3 w-3" />
        <span>Solde</span>
      </>
    ) : order.payment_method === "online" ? (
      <>
        <CreditCard className="h-3 w-3" />
        <span>En ligne</span>
      </>
    ) : (
      <>
        <Banknote className="h-3 w-3" />
        <span>Sur place</span>
      </>
    );

  return (
    <div className={`rounded-xl p-4 ${config.bgClass}`}>
      {/* Header */}
      <div className="mb-2 flex items-start justify-between">
        <div>
          <p className="text-2xl font-bold">{displayNumber}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="relative" ref={pickerRef}>
            <button onClick={() => setShowStatusPicker((v) => !v)}>
              <OrderStatusBadge status={order.status} />
            </button>
            {showStatusPicker && (
              <div className="absolute right-0 top-full z-10 mt-1 rounded-lg border bg-white p-1 shadow-lg">
                {EDITABLE_STATUSES.filter((s) => s !== order.status).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      updateStatus(s);
                      setShowStatusPicker(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted ${ORDER_STATUS_CONFIG[s].color}`}
                  >
                    {ORDER_STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {paymentIcon}
          </div>
          {orderTypeLabel && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
              {orderTypeLabel}
            </span>
          )}
        </div>
      </div>

      {/* Pickup time */}
      {order.pickup_time && (
        <p className="mb-2 text-xs font-medium">
          Retrait : {formatTime(order.pickup_time)}
        </p>
      )}

      {/* Items */}
      <div className="mb-3 space-y-1">
        {order.items.map((item, i) => (
          <div key={i} className="text-sm">
            <span className="font-semibold">{item.quantity}x</span>{" "}
            {item.product_name}
            {item.is_menu && (
              <span className="ml-1 text-xs font-semibold text-primary">(Menu)</span>
            )}
            {item.modifiers.length > 0 && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({item.modifiers.map((m) => m.modifier_name).join(", ")})
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Total */}
      <p className="mb-3 text-sm font-bold">
        Total : {formatPrice(order.total_price)}
      </p>

      {/* Action button */}
      {isUnpaidOnSite ? (
        <Button
          onClick={markAsPaid}
          className="h-12 w-full rounded-xl bg-blue-600 font-semibold hover:bg-blue-700"
          size="lg"
        >
          Encaisser
        </Button>
      ) : config.nextStatus ? (
        <Button
          onClick={() => updateStatus(config.nextStatus!)}
          className="h-12 w-full rounded-xl font-semibold"
          size="lg"
        >
          {config.nextLabel}
        </Button>
      ) : null}
    </div>
  );
}
