"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Driver, DeliveryStatus, OrderStatus, OrderType } from "@/lib/types";
import { useCartStore } from "@/stores/cart-store";
import { usePushSubscription } from "@/hooks/use-push-subscription";
import { Bell, BellOff, Phone, Bike, Check, ChefHat, UtensilsCrossed, PackageCheck } from "lucide-react";
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

const STANDARD_STEP_LABELS: Record<OrderStatus, string> = {
  new: "Commande reçue",
  preparing: "En préparation",
  ready: "Prête à servir",
  done: "Terminée",
  cancelled: "Annulée",
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

    return () => {
      supabase.removeChannel(channel);
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

  const standardIcons: Record<OrderStatus, React.ReactNode> = {
    new: <Check className="h-3 w-3" strokeWidth={3} />,
    preparing: <ChefHat className="h-3 w-3" strokeWidth={2.5} />,
    ready: <UtensilsCrossed className="h-3 w-3" strokeWidth={2.5} />,
    done: <PackageCheck className="h-3 w-3" strokeWidth={2.5} />,
    cancelled: <Check className="h-3 w-3" />,
  };

  return (
    <div className="space-y-4">
      {/* Live status banner — dark */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-foreground to-foreground/85 p-4 text-background">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_90%_50%,rgba(48,128,255,0.12),transparent_60%)]" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-background/50">
              Statut en direct
            </span>
            {isSupported && status !== "done" && status !== "cancelled" && (
              <button
                onClick={handleSubscribe}
                disabled={isSubscribed || loading}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                  isSubscribed
                    ? "bg-background/15 text-background"
                    : "bg-background/10 text-background/80 hover:bg-background/15"
                }`}
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
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-lg">{liveLabel.emoji}</span>
            <h3 className="text-[18px] font-bold tracking-tight">{liveLabel.headline}</h3>
          </div>
          {liveLabel.eta && (
            <p className="mt-0.5 text-[12px] text-background/60">
              Temps estimé :{" "}
              <span className="font-semibold text-[#54a2ff]">{liveLabel.eta}</span>
            </p>
          )}
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-background/15">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#54a2ff] to-[#3080ff] transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Timeline — vertical with circle icons */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          Étapes
        </h3>
        <div className="flex flex-col">
          {isDelivery
            ? deliverySteps.map((s, i, arr) => {
                const isDone = i < currentDeliveryIdx;
                const isActive = i === currentDeliveryIdx;
                const isLast = i === arr.length - 1;
                return (
                  <div key={s} className="relative flex gap-3.5">
                    <div className="relative z-10 flex flex-col items-center">
                      <div
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-bold transition-colors ${
                          isDone
                            ? "bg-success-soft text-success"
                            : isActive
                              ? "bg-foreground text-background ring-4 ring-foreground/10"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isDone ? (
                          <Check className="h-3.5 w-3.5" strokeWidth={3} />
                        ) : s === "assigned" || s === "picked_up" ? (
                          <Bike className="h-3 w-3" strokeWidth={2.5} />
                        ) : s === "delivered" ? (
                          <PackageCheck className="h-3 w-3" strokeWidth={2.5} />
                        ) : s === "preparing" ? (
                          <ChefHat className="h-3 w-3" strokeWidth={2.5} />
                        ) : (
                          <Check className="h-3 w-3" strokeWidth={2.5} />
                        )}
                      </div>
                      {!isLast && (
                        <div
                          className={`mt-0.5 w-[2px] flex-1 ${
                            isDone ? "bg-success" : "bg-border"
                          }`}
                          style={{ minHeight: "20px" }}
                        />
                      )}
                    </div>
                    <div className={`flex-1 ${!isLast ? "pb-4" : ""}`}>
                      <p
                        className={`text-[14px] font-semibold ${
                          isDone || isActive ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {DELIVERY_STEP_LABELS[s]}
                      </p>
                      <p className={`mt-0.5 font-mono text-[11px] ${isActive ? "text-info" : "text-muted-foreground"}`}>
                        {isDone ? "Fait" : isActive ? "En cours…" : "—"}
                      </p>
                    </div>
                  </div>
                );
              })
            : standardStatuses.map((s, i, arr) => {
                const isDone = i < currentIdx;
                const isActive = i === currentIdx;
                const isLast = i === arr.length - 1;
                return (
                  <div key={s} className="relative flex gap-3.5">
                    <div className="relative z-10 flex flex-col items-center">
                      <div
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full transition-colors ${
                          isDone
                            ? "bg-success-soft text-success"
                            : isActive
                              ? "bg-foreground text-background ring-4 ring-foreground/10"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isDone ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : standardIcons[s]}
                      </div>
                      {!isLast && (
                        <div
                          className={`mt-0.5 w-[2px] flex-1 ${
                            isDone ? "bg-success" : "bg-border"
                          }`}
                          style={{ minHeight: "20px" }}
                        />
                      )}
                    </div>
                    <div className={`flex-1 ${!isLast ? "pb-4" : ""}`}>
                      <p
                        className={`text-[14px] font-semibold ${
                          isDone || isActive ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {STANDARD_STEP_LABELS[s]}
                      </p>
                      <p className={`mt-0.5 font-mono text-[11px] ${isActive ? "text-info" : "text-muted-foreground"}`}>
                        {isDone ? "Fait" : isActive ? "En cours…" : "—"}
                      </p>
                    </div>
                  </div>
                );
              })}
        </div>
      </div>

      {/* Driver card */}
      {isDelivery && driver && (
        <div className="flex items-center gap-3 rounded-2xl border-[1.5px] border-info/20 bg-info-soft/40 p-3.5">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-info text-background">
            <Bike className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-info">
              Votre livreur
            </p>
            <p className="truncate text-[14px] font-bold">{driver.full_name}</p>
          </div>
          {driver.phone && (
            <a
              href={`tel:${driver.phone}`}
              className="flex h-10 items-center gap-1.5 rounded-full bg-info px-4 text-[12px] font-semibold text-background transition-opacity active:opacity-90"
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
