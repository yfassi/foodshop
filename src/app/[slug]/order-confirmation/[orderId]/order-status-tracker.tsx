"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { ORDER_STATUS_CONFIG } from "@/lib/constants";
import type { OrderStatus } from "@/lib/types";
import { useCartStore } from "@/stores/cart-store";

export function OrderStatusTracker({
  orderId,
  initialStatus,
}: {
  orderId: string;
  initialStatus: OrderStatus;
}) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const clearCart = useCartStore((s) => s.clearCart);

  useEffect(() => {
    // Clear cart on mount (order placed successfully)
    clearCart();
  }, [clearCart]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const newStatus = (payload.new as { status: OrderStatus }).status;
          setStatus(newStatus);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const config = ORDER_STATUS_CONFIG[status];
  const statuses: OrderStatus[] = ["new", "preparing", "ready", "done"];
  const currentIdx = statuses.indexOf(status);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Suivi en direct</h3>

      {/* Status badge */}
      <div
        className={`mb-4 rounded-lg px-4 py-3 text-center text-sm font-bold ${config.bgClass}`}
      >
        {config.label}
      </div>

      {/* Progress steps */}
      <div className="flex items-center justify-between">
        {statuses.map((s, i) => {
          const stepConfig = ORDER_STATUS_CONFIG[s];
          const isActive = i <= currentIdx;
          return (
            <div key={s} className="flex flex-1 flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`mt-1.5 text-[10px] font-medium ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {stepConfig.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
