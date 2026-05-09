"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
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

function getStandardLiveLabel(status: OrderStatus): { headline: string; emoji: string; eta?: string } {
  if (status === "ready") return { headline: "Votre commande est prête", emoji: "🍽", eta: "À récupérer" };
  if (status === "done") return { headline: "Commande terminée", emoji: "✓", eta: "Bon appétit !" };
  if (status === "preparing") return { headline: "En préparation", emoji: "🧑‍🍳", eta: "~3 min" };
  if (status === "cancelled") return { headline: "Commande annulée", emoji: "✕" };
  return { headline: "Commande reçue", emoji: "✓", eta: "On s'en occupe" };
}

function getDeliveryLiveLabel(step: DeliveryStep): { headline: string; emoji: string; eta?: string } {
  if (step === "delivered") return { headline: "Livrée", emoji: "✓", eta: "Bon appétit !" };
  if (step === "picked_up") return { headline: "En route vers vous", emoji: "🛵", eta: "~10 min" };
  if (step === "assigned") return { headline: "Livreur assigné", emoji: "🛵", eta: "Préparation en cours" };
  if (step === "preparing") return { headline: "En préparation", emoji: "🧑‍🍳", eta: "~5 min" };
  return { headline: "Commande reçue", emoji: "✓", eta: "On s'en occupe" };
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
        async (payload) => {
          const row = payload.new as {
            status: OrderStatus;
            delivery_status?: DeliveryStatus | null;
            driver_id?: string | null;
          };
          setStatus(row.status);
          setDeliveryStatus(row.delivery_status ?? null);
          if (row.driver_id && orderType === "delivery" && !driver) {
            const { data: d } = await supabase
              .from("drivers")
              .select("*")
              .eq("id", row.driver_id)
              .single<Driver>();
            if (d) setDriver(d);
          }
        }
      )
      .subscribe();

    // Polling fallback every 4s in case realtime hiccups
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from("orders")
        .select("status, delivery_status, driver_id")
        .eq("id", orderId)
        .single();
      if (data) {
        setStatus(data.status as OrderStatus);
        setDeliveryStatus((data.delivery_status as DeliveryStatus | null) ?? null);
      }
    }, 4000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [orderId, orderType, driver]);

  const handleSubscribe = async () => {
    const ok = await subscribe({ orderId, role: "customer" });
    if (ok) {
      toast.success("Vous serez notifié quand votre commande sera prête");
    } else {
      toast.error("Impossible d'activer les notifications");
    }
  };

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

  const liveLabel = isDelivery
    ? getDeliveryLiveLabel(currentDeliveryStep)
    : getStandardLiveLabel(status);

  const totalSteps = isDelivery ? deliverySteps.length : standardStatuses.length;
  const currentStepNumber = (isDelivery ? currentDeliveryIdx : currentIdx) + 1;
  const progressPct = Math.max(
    8,
    Math.min(100, (currentStepNumber / totalSteps) * 100)
  );

  return (
    <>
      {/* Live status banner */}
      <div className="oc-status">
        <div className="oc-status-top">
          <span className="oc-status-kicker">Statut en direct</span>
          {isSupported && status !== "done" && status !== "cancelled" && (
            <button
              onClick={handleSubscribe}
              disabled={isSubscribed || loading}
              className={`oc-status-bell${isSubscribed ? " on" : ""}`}
            >
              {isSubscribed ? (
                <>
                  <Bell className="h-3 w-3" />
                  Activées
                </>
              ) : (
                <>
                  <BellOff className="h-3 w-3" />
                  {loading ? "…" : "Me notifier"}
                </>
              )}
            </button>
          )}
        </div>
        <div className="oc-status-headline">
          <span className="oc-status-emoji">{liveLabel.emoji}</span>
          <h3 className="oc-status-h">{liveLabel.headline}</h3>
        </div>
        {liveLabel.eta && (
          <p className="oc-status-eta">
            Temps estimé : <b>{liveLabel.eta}</b>
          </p>
        )}
        <div className="oc-status-bar">
          <div style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Driver card */}
      {isDelivery && driver && (
        <div className="oc-driver">
          <div className="oc-driver-ava">
            <Bike className="h-5 w-5" />
          </div>
          <div className="oc-driver-info">
            <p className="oc-driver-tag">Votre livreur</p>
            <p className="oc-driver-name">{driver.full_name}</p>
          </div>
          {driver.phone && (
            <a href={`tel:${driver.phone}`} className="oc-driver-call">
              <Phone className="h-3.5 w-3.5" />
              Appeler
            </a>
          )}
        </div>
      )}
    </>
  );
}
