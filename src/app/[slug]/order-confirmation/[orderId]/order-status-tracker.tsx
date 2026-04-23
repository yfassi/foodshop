"use client";

import { useState, useEffect } from "react";
import { ORDER_STATUS_CONFIG } from "@/lib/constants";
import type { Driver, DeliveryStatus, OrderStatus, OrderType } from "@/lib/types";
import { useCartStore } from "@/stores/cart-store";
import { usePushSubscription } from "@/hooks/use-push-subscription";
import { Bell, BellOff, Phone, Bike } from "lucide-react";
import { toast } from "sonner";

type DeliveryStep =
  | "new"
  | "preparing"
  | "assigned"
  | "picked_up"
  | "delivered";

const DELIVERY_STEP_LABELS: Record<DeliveryStep, string> = {
  new: "Reçue",
  preparing: "Préparation",
  assigned: "Livreur assigné",
  picked_up: "En route",
  delivered: "Livrée",
};

function deriveDeliveryStep(
  status: OrderStatus,
  deliveryStatus: DeliveryStatus | null
): DeliveryStep {
  if (deliveryStatus === "delivered") return "delivered";
  if (deliveryStatus === "picked_up") return "picked_up";
  if (deliveryStatus === "assigned") return "assigned";
  if (status === "preparing" || status === "ready") return "preparing";
  return "new";
}

export function OrderStatusTracker({
  orderId,
  initialStatus,
  orderType,
  initialDeliveryStatus,
  initialDriver,
}: {
  orderId: string;
  initialStatus: OrderStatus;
  orderType?: OrderType;
  initialDeliveryStatus?: DeliveryStatus | null;
  initialDriver?: Driver | null;
}) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus | null>(
    initialDeliveryStatus ?? null
  );
  const [driver, setDriver] = useState<Driver | null>(initialDriver ?? null);
  const clearCart = useCartStore((s) => s.clearCart);
  const { isSupported, isSubscribed, loading, subscribe } =
    usePushSubscription();

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}/status`, {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          status: OrderStatus;
          delivery_status: DeliveryStatus | null;
          driver: Driver | null;
        };
        setStatus(data.status);
        setDeliveryStatus(data.delivery_status);
        if (data.driver && orderType === "delivery") {
          setDriver(data.driver);
        }
      } catch {
        // network hiccup — next tick will retry
      }
    };

    poll();
    const interval = setInterval(poll, 8000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [orderId, orderType]);

  const handleSubscribe = async () => {
    const ok = await subscribe({ orderId, role: "customer" });
    if (ok) {
      toast.success("Vous serez notifié quand votre commande sera prête");
    } else {
      toast.error("Impossible d'activer les notifications");
    }
  };

  const config = ORDER_STATUS_CONFIG[status];
  const isDelivery = orderType === "delivery";
  const deliverySteps: DeliveryStep[] = [
    "new",
    "preparing",
    "assigned",
    "picked_up",
    "delivered",
  ];
  const standardStatuses: OrderStatus[] = ["new", "preparing", "ready", "done"];
  const currentDeliveryStep = deriveDeliveryStep(status, deliveryStatus);
  const currentDeliveryIdx = deliverySteps.indexOf(currentDeliveryStep);
  const currentIdx = standardStatuses.indexOf(status);

  const deliveryBadge = (() => {
    if (!isDelivery) return null;
    if (deliveryStatus === "delivered")
      return { label: "Commande livrée", bgClass: "bg-green-100 text-green-700" };
    if (deliveryStatus === "picked_up")
      return { label: "En route vers vous", bgClass: "bg-blue-100 text-blue-700" };
    if (deliveryStatus === "assigned")
      return {
        label: "Livreur assigné",
        bgClass: "bg-indigo-100 text-indigo-700",
      };
    if (deliveryStatus === "failed")
      return { label: "Échec de livraison", bgClass: "bg-red-100 text-red-700" };
    return null;
  })();

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
        className={`mb-4 rounded-lg px-4 py-3 text-center text-sm font-bold ${
          deliveryBadge ? deliveryBadge.bgClass : config.bgClass
        }`}
      >
        {deliveryBadge ? deliveryBadge.label : config.label}
      </div>

      {/* Progress steps */}
      {isDelivery ? (
        <div className="flex items-center justify-between">
          {deliverySteps.map((s, i) => {
            const isActive = i <= currentDeliveryIdx;
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
                  className={`mt-1.5 text-center text-[10px] font-medium ${
                    isActive ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {DELIVERY_STEP_LABELS[s]}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center justify-between">
          {standardStatuses.map((s, i) => {
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
      )}

      {/* Driver card */}
      {isDelivery && driver && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Bike className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Votre livreur</p>
            <p className="truncate text-sm font-semibold">{driver.full_name}</p>
          </div>
          {driver.phone && (
            <a
              href={`tel:${driver.phone}`}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
            >
              <Phone className="h-3.5 w-3.5" />
              Appeler
            </a>
          )}
        </div>
      )}
    </div>
  );
}
