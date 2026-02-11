"use client";

import type { Order, OrderStatus, OrderView } from "@/lib/types";
import { formatPrice, formatTime } from "@/lib/format";
import { ORDER_STATUS_CONFIG } from "@/lib/constants";
import { OrderStatusBadge } from "./order-status-badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { CreditCard, Banknote, Wallet } from "lucide-react";

interface OrderCardProps {
  order: Order;
  view?: OrderView;
}

export function OrderCard({ order, view = "comptoir" }: OrderCardProps) {
  const config = ORDER_STATUS_CONFIG[order.status];

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

  const displayNumber =
    order.display_order_number || `#${order.order_number}`;

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
            <p className="text-base font-semibold">
              {order.customer_info.name}
            </p>
          </div>
          <OrderStatusBadge status={order.status} />
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
          <p className="text-sm font-medium">{order.customer_info.name}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <OrderStatusBadge status={order.status} />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {paymentIcon}
          </div>
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
      {config.nextStatus && (
        <Button
          onClick={() => updateStatus(config.nextStatus!)}
          className="h-12 w-full rounded-xl font-semibold"
          size="lg"
        >
          {config.nextLabel}
        </Button>
      )}
    </div>
  );
}
