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

function getStandardLiveLabel(status: OrderStatus): { headline: string; eta?: string } {
  if (status === "ready") return { headline: "Votre commande est prête", eta: "À récupérer" };
  if (status === "done") return { headline: "Commande terminée", eta: "Bon appétit !" };
  if (status === "preparing") return { headline: "En préparation", eta: "~3 min" };
  if (status === "cancelled") return { headline: "Commande annulée" };
  return { headline: "Commande reçue", eta: "On s'en occupe" };
}

function getDeliveryLiveLabel(step: DeliveryStep): { headline: string; eta?: string } {
  if (step === "delivered") return { headline: "Livrée", eta: "Bon appétit !" };
  if (step === "picked_up") return { headline: "En route vers vous", eta: "~10 min" };
  if (step === "assigned") return { headline: "Livreur assigné", eta: "Préparation en cours" };
  if (step === "preparing") return { headline: "En préparation", eta: "~5 min" };
  return { headline: "Commande reçue", eta: "On s'en occupe" };
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
      {/* Live status banner — kit: navy gradient + tomato red glow accent */}
      <div className="relative overflow-hidden rounded-2xl p-4 text-[#f8f1e7]" style={{ background: "linear-gradient(135deg, #172846, #0c1a36)" }}>
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at 90% 50%, #d7352d33, transparent 60%)" }} />
        <div className="relative">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#d7352d]">
              Statut en direct
            </span>
            {isSupported && status !== "done" && status !== "cancelled" && (
              <button
                onClick={handleSubscribe}
                disabled={isSubscribed || loading}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                  isSubscribed
                    ? "bg-white/15 text-white"
                    : "bg-white/10 text-white/80 hover:bg-white/15"
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
            <h3 className="text-[18px] font-extrabold tracking-[-0.02em]">{liveLabel.headline}</h3>
          </div>
          {liveLabel.eta && (
            <p className="mt-0.5 text-[12px] text-[#f8f1e7]/65">
              Temps estimé :{" "}
              <span className="font-mono font-bold text-white">{liveLabel.eta}</span>
            </p>
          )}
          {/* Progress bar — kit: tomato red gradient */}
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-[#0c1a36]">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progressPct}%`,
                background: "linear-gradient(90deg, #d7352d, #f56e54)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Timeline — kit: dashed connector, green done, tomato active, muted pending */}
      <div className="rounded-[14px] border border-[#dbd7d2] bg-white p-4">
        <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#a89e94]">
          Etapes
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
                            ? "bg-[#d8efd9] text-[#00873a]"
                            : isActive
                              ? "text-white"
                              : "bg-[#f0ebe1] text-[#68625e]"
                        }`}
                        style={isActive ? { backgroundColor: "#d7352d", boxShadow: "0 0 0 5px #d7352d2e" } : {}}
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
                        /* Dashed connector — kit: 2px dashed repeating */
                        <div
                          className="mt-0.5 flex-1"
                          style={{
                            width: 2,
                            minHeight: 20,
                            backgroundImage: `repeating-linear-gradient(to bottom, ${isDone ? "#00873a" : "#dbd7d2"} 0, ${isDone ? "#00873a" : "#dbd7d2"} 3px, transparent 3px, transparent 6px)`,
                          }}
                        />
                      )}
                    </div>
                    <div className={`flex-1 ${!isLast ? "pb-4" : ""}`}>
                      <p className={`text-[14px] font-bold ${isDone || isActive ? "text-[#1c1410]" : "text-[#a89e94]"}`}>
                        {DELIVERY_STEP_LABELS[s]}
                      </p>
                      <p className={`mt-0.5 font-mono text-[12px] ${isActive ? "text-[#3080ff]" : "text-[#a89e94]"}`}>
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
                            ? "bg-[#d8efd9] text-[#00873a]"
                            : isActive
                              ? "text-white"
                              : "bg-[#f0ebe1] text-[#68625e]"
                        }`}
                        style={isActive ? { backgroundColor: "#d7352d", boxShadow: "0 0 0 5px #d7352d2e" } : {}}
                      >
                        {isDone ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : standardIcons[s]}
                      </div>
                      {!isLast && (
                        <div
                          className="mt-0.5 flex-1"
                          style={{
                            width: 2,
                            minHeight: 20,
                            backgroundImage: `repeating-linear-gradient(to bottom, ${isDone ? "#00873a" : "#dbd7d2"} 0, ${isDone ? "#00873a" : "#dbd7d2"} 3px, transparent 3px, transparent 6px)`,
                          }}
                        />
                      )}
                    </div>
                    <div className={`flex-1 ${!isLast ? "pb-4" : ""}`}>
                      <p className={`text-[14px] font-bold ${isDone || isActive ? "text-[#1c1410]" : "text-[#a89e94]"}`}>
                        {STANDARD_STEP_LABELS[s]}
                      </p>
                      <p className={`mt-0.5 font-mono text-[12px] ${isActive ? "text-[#3080ff]" : "text-[#a89e94]"}`}>
                        {isDone ? "Fait" : isActive ? "En cours…" : "—"}
                      </p>
                    </div>
                  </div>
                );
              })}
        </div>
      </div>

      {/* Driver card — kit: navy bg, blue accent */}
      {isDelivery && driver && (
        <div className="flex items-center gap-3 rounded-[14px] border-[1.5px] border-[#d8e3f4] bg-[#d8e3f4]/40 p-3.5">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-[#172846] text-white">
            <Bike className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#172846]">
              Votre livreur
            </p>
            <p className="truncate text-[14px] font-bold text-[#1c1410]">{driver.full_name}</p>
          </div>
          {driver.phone && (
            <a
              href={`tel:${driver.phone}`}
              className="flex h-10 items-center gap-1.5 rounded-full bg-[#172846] px-4 text-[12px] font-semibold text-white transition-opacity active:opacity-90"
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
