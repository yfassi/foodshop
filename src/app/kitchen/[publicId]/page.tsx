"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Order, OrderStatus } from "@/lib/types";
import { useNewOrderAlert } from "@/components/orders/new-order-alert";
import { ChefHat, Loader2, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";

export default function KitchenDisplayPage() {
  const params = useParams<{ publicId: string }>();
  const publicId = params.publicId;
  const [orders, setOrders] = useState<Order[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [muted, setMuted] = useState(false);
  const { playAlert } = useNewOrderAlert();
  const seenOrderIds = useRef<Set<string>>(new Set());

  // Tick clock for elapsed time displays
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(interval);
  }, []);

  // Load restaurant + initial orders
  useEffect(() => {
    const supabase = createClient();
    const init = async () => {
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id, name")
        .eq("public_id", publicId)
        .single();
      if (!restaurant) return;
      setRestaurantId(restaurant.id);
      setRestaurantName(restaurant.name);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: todayOrders } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .eq("paid", true)
        .gte("created_at", today.toISOString())
        .in("status", ["new", "preparing"])
        .order("created_at", { ascending: true })
        .returns<Order[]>();

      setOrders(todayOrders || []);
      (todayOrders || []).forEach((o) => seenOrderIds.current.add(o.id));
      setLoading(false);
    };
    init();
  }, [publicId]);

  // Realtime subscription
  useEffect(() => {
    if (!restaurantId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`kitchen-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const newOrder = payload.new as Order;
          if (!newOrder.paid) return;
          setOrders((prev) =>
            prev.some((o) => o.id === newOrder.id) ? prev : [...prev, newOrder],
          );
          if (!seenOrderIds.current.has(newOrder.id) && !muted) {
            playAlert();
          }
          seenOrderIds.current.add(newOrder.id);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const updated = payload.new as Order;
          setOrders((prev) => {
            const isInScope =
              updated.paid &&
              (updated.status === "new" || updated.status === "preparing");
            if (!isInScope) return prev.filter((o) => o.id !== updated.id);
            const exists = prev.some((o) => o.id === updated.id);
            if (exists) return prev.map((o) => (o.id === updated.id ? updated : o));
            return [...prev, updated];
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, playAlert, muted]);

  const updateStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    const res = await fetch("/api/orders/update-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId, status }),
    });
    if (!res.ok) toast.error("Erreur lors de la mise à jour");
  }, []);

  const newOrders = orders.filter((o) => o.status === "new");
  const preparingOrders = orders.filter((o) => o.status === "preparing");

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-zinc-950 text-zinc-100">
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
            <ChefHat className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Cuisine</p>
            <p className="text-base font-bold">{restaurantName}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-zinc-500">À préparer</p>
            <p className="text-2xl font-bold text-orange-400">{newOrders.length}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-zinc-500">En cours</p>
            <p className="text-2xl font-bold text-amber-400">{preparingOrders.length}</p>
          </div>
          <button
            onClick={() => setMuted((m) => !m)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 transition-colors hover:text-zinc-100"
            aria-label={muted ? "Activer le son" : "Couper le son"}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-px overflow-hidden bg-zinc-800 lg:grid-cols-2">
        <KitchenColumn
          title="À préparer"
          accent="orange"
          orders={newOrders}
          actionLabel="Démarrer"
          onAction={(id) => updateStatus(id, "preparing")}
          now={now}
        />
        <KitchenColumn
          title="En cours"
          accent="amber"
          orders={preparingOrders}
          actionLabel="Marquer prête"
          onAction={(id) => updateStatus(id, "ready")}
          now={now}
        />
      </div>
    </div>
  );
}

function KitchenColumn({
  title,
  accent,
  orders,
  actionLabel,
  onAction,
  now,
}: {
  title: string;
  accent: "orange" | "amber";
  orders: Order[];
  actionLabel: string;
  onAction: (orderId: string) => void;
  now: number;
}) {
  const accentDot =
    accent === "orange" ? "bg-orange-500" : "bg-amber-500";
  const accentText =
    accent === "orange" ? "text-orange-400" : "text-amber-400";

  return (
    <section className="flex min-h-0 flex-col bg-zinc-950">
      <div className="flex shrink-0 items-center gap-2 border-b border-zinc-800 px-6 py-3">
        <span className={`h-2.5 w-2.5 animate-pulse rounded-full ${accentDot}`} />
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-300">
          {title}
        </h2>
        <span className={`ml-2 text-sm font-bold ${accentText}`}>
          {orders.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {orders.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-zinc-600">Aucune commande</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {orders.map((order) => (
              <KitchenCard
                key={order.id}
                order={order}
                actionLabel={actionLabel}
                onAction={() => onAction(order.id)}
                now={now}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function KitchenCard({
  order,
  actionLabel,
  onAction,
  now,
}: {
  order: Order;
  actionLabel: string;
  onAction: () => void;
  now: number;
}) {
  const elapsedMin = Math.max(
    0,
    Math.floor((now - new Date(order.created_at).getTime()) / 60_000),
  );
  const urgent = elapsedMin >= 10;
  const number = order.display_order_number || `#${order.order_number}`;
  const orderTypeLabel =
    order.order_type === "dine_in"
      ? "Sur place"
      : order.order_type === "takeaway"
      ? "À emporter"
      : order.order_type === "delivery"
      ? "Livraison"
      : null;

  return (
    <article
      className={`flex flex-col rounded-2xl border p-4 transition-colors ${
        urgent
          ? "border-red-500/40 bg-red-950/30"
          : "border-zinc-800 bg-zinc-900"
      }`}
    >
      <header className="mb-3 flex items-start justify-between gap-2">
        <p className="text-3xl font-black leading-none tracking-tight text-zinc-50">
          {number}
        </p>
        <div className="flex flex-col items-end gap-1 text-right">
          <span
            className={`rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${
              urgent ? "bg-red-500/20 text-red-300" : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {elapsedMin === 0 ? "à l'instant" : `${elapsedMin} min`}
          </span>
          {orderTypeLabel && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              {orderTypeLabel}
            </span>
          )}
        </div>
      </header>

      <div className="mb-4 flex-1 space-y-2">
        {order.items.map((item, i) => (
          <div key={i}>
            <p className="text-base font-bold text-zinc-100">
              {item.quantity}× {item.product_name}
              {item.is_menu && (
                <span className="ml-1 text-xs font-semibold text-orange-400">
                  (Menu)
                </span>
              )}
            </p>
            {item.modifiers.length > 0 && (
              <p className="ml-5 text-xs text-zinc-400">
                {item.modifiers.map((m) => m.modifier_name).join(" · ")}
              </p>
            )}
          </div>
        ))}
      </div>

      {order.customer_info?.notes && (
        <p className="mb-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          📝 {order.customer_info.notes}
        </p>
      )}

      <button
        onClick={onAction}
        className="mt-auto h-12 w-full rounded-xl bg-zinc-100 text-sm font-bold uppercase tracking-wider text-zinc-900 transition-colors active:bg-zinc-300"
      >
        {actionLabel}
      </button>
    </article>
  );
}
