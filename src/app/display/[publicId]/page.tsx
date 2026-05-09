"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Order } from "@/lib/types";
import { useNewOrderAlert } from "@/components/orders/new-order-alert";
import { Loader2, Volume2, VolumeX, Maximize2 } from "lucide-react";

export default function CustomerDisplayPage() {
  const params = useParams<{ publicId: string }>();
  const publicId = params.publicId;
  const [orders, setOrders] = useState<Order[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string>("");
  const [restaurantLogo, setRestaurantLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const { playAlert } = useNewOrderAlert();
  const knownReadyIds = useRef<Set<string>>(new Set());

  // Tick clock display every second
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(interval);
  }, []);

  // Load restaurant + initial orders
  useEffect(() => {
    const supabase = createClient();
    const init = async () => {
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id, name, logo_url")
        .eq("public_id", publicId)
        .single();
      if (!restaurant) return;
      setRestaurantId(restaurant.id);
      setRestaurantName(restaurant.name);
      setRestaurantLogo(restaurant.logo_url);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: todayOrders } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .eq("paid", true)
        .gte("created_at", today.toISOString())
        .in("status", ["preparing", "ready"])
        .order("created_at", { ascending: true })
        .returns<Order[]>();

      setOrders(todayOrders || []);
      (todayOrders || [])
        .filter((o) => o.status === "ready")
        .forEach((o) => knownReadyIds.current.add(o.id));
      setLoading(false);
    };
    init();
  }, [publicId]);

  // Realtime subscription
  useEffect(() => {
    if (!restaurantId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`display-${restaurantId}`)
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
          if (newOrder.status !== "preparing" && newOrder.status !== "ready") return;
          setOrders((prev) =>
            prev.some((o) => o.id === newOrder.id) ? prev : [...prev, newOrder],
          );
          if (newOrder.status === "ready") {
            knownReadyIds.current.add(newOrder.id);
          }
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
          const isInScope =
            updated.paid &&
            (updated.status === "preparing" || updated.status === "ready");

          // Play sound when an order moves to "ready" for the first time
          if (
            updated.status === "ready" &&
            !knownReadyIds.current.has(updated.id) &&
            !muted
          ) {
            playAlert();
          }
          if (updated.status === "ready") {
            knownReadyIds.current.add(updated.id);
          }

          setOrders((prev) => {
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

  const requestFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const preparingOrders = orders
    .filter((o) => o.status === "preparing")
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  const readyOrders = orders
    .filter((o) => o.status === "ready")
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-card px-8 py-5">
        <div className="flex items-center gap-4">
          {restaurantLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={restaurantLogo}
              alt=""
              className="h-12 w-12 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-lg font-extrabold text-primary-foreground">
              {restaurantName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-2xl font-extrabold tracking-tight">
              {restaurantName}
            </p>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Suivi des commandes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <p className="font-mono text-3xl font-bold tabular-nums">
            {now.toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <button
            onClick={() => setMuted((m) => !m)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
            aria-label={muted ? "Activer le son" : "Couper le son"}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            onClick={requestFullscreen}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Plein écran"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-px overflow-hidden bg-border md:grid-cols-2">
        <DisplayColumn
          title="En préparation"
          subtitle="Patientez quelques instants"
          accent="amber"
          orders={preparingOrders}
        />
        <DisplayColumn
          title="Prêtes à récupérer"
          subtitle="Présentez-vous au comptoir"
          accent="green"
          orders={readyOrders}
          highlight
        />
      </div>

      <footer className="shrink-0 border-t border-border bg-card px-8 py-2 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">
        Propulsé par TaapR
      </footer>
    </div>
  );
}

function DisplayColumn({
  title,
  subtitle,
  accent,
  orders,
  highlight = false,
}: {
  title: string;
  subtitle: string;
  accent: "amber" | "green";
  orders: Order[];
  highlight?: boolean;
}) {
  const accentBg =
    accent === "amber"
      ? "bg-amber-50 dark:bg-amber-950/30"
      : "bg-emerald-50 dark:bg-emerald-950/30";
  const accentNumberClass =
    accent === "amber"
      ? "text-amber-700 dark:text-amber-300"
      : "text-emerald-700 dark:text-emerald-300";
  const accentDot =
    accent === "amber" ? "bg-amber-500" : "bg-emerald-500";

  return (
    <section className={`flex min-h-0 flex-col ${accentBg}`}>
      <header className="flex shrink-0 flex-col gap-1 border-b border-border/50 px-8 py-5">
        <div className="flex items-center gap-3">
          <span
            className={`h-3 w-3 rounded-full ${accentDot} ${
              accent === "green" ? "animate-pulse" : ""
            }`}
          />
          <h2 className="text-2xl font-extrabold uppercase tracking-tight">
            {title}
          </h2>
          <span className="ml-auto text-xl font-bold text-muted-foreground">
            {orders.length}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        {orders.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-2xl font-medium text-muted-foreground/40">—</p>
          </div>
        ) : (
          <div
            className={`grid gap-6 ${
              highlight
                ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4"
            }`}
          >
            {orders.map((order) => {
              const number =
                order.display_order_number || `#${order.order_number}`;
              return (
                <div
                  key={order.id}
                  className={`flex aspect-square items-center justify-center rounded-3xl bg-card font-mono font-black tabular-nums tracking-tight shadow-sm ${accentNumberClass} ${
                    highlight ? "text-7xl xl:text-8xl 2xl:text-9xl" : "text-5xl xl:text-6xl"
                  } ${highlight ? "ring-4 ring-emerald-500/30" : ""}`}
                >
                  {number}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
