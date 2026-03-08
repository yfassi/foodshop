"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { ORDER_STATUS_CONFIG } from "@/lib/constants";
import type { OrderStatus } from "@/lib/types";
import { useCartStore } from "@/stores/cart-store";
import { usePushSubscription } from "@/hooks/use-push-subscription";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";

export function OrderStatusTracker({
  orderId,
  initialStatus,
}: {
  orderId: string;
  initialStatus: OrderStatus;
}) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const clearCart = useCartStore((s) => s.clearCart);
  const { isSupported, isSubscribed, loading, subscribe } =
    usePushSubscription();

  useEffect(() => {
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

  const handleSubscribe = async () => {
    const ok = await subscribe({ orderId, role: "customer" });
    if (ok) {
      toast.success("Vous serez notifié quand votre commande sera prête");
    } else {
      toast.error("Impossible d'activer les notifications");
    }
  };

  const config = ORDER_STATUS_CONFIG[status];
  const statuses: OrderStatus[] = ["new", "preparing", "ready", "done"];
  const currentIdx = statuses.indexOf(status);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Suivi en direct
        </h3>
        {isSupported && status !== "done" && status !== "cancelled" && (
          <button
            onClick={handleSubscribe}
            disabled={isSubscribed || loading}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              isSubscribed
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
            }`}
          >
            {isSubscribed ? (
              <>
                <Bell className="h-3.5 w-3.5" />
                Activées
              </>
            ) : (
              <>
                <BellOff className="h-3.5 w-3.5" />
                {loading ? "..." : "Me notifier"}
              </>
            )}
          </button>
        )}
      </div>

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
