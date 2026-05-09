"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import confetti from "canvas-confetti";
import { createClient } from "@/lib/supabase/client";
import type { Order, OrderView } from "@/lib/types";
import { useNewOrderAlert } from "@/components/orders/new-order-alert";
import { CounterView, KitchenView } from "@/components/orders/order-views";
import { PartyPopper, ArrowRight, Monitor, ChefHat, Bell, BellOff, ExternalLink, Tv, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushSubscription } from "@/hooks/use-push-subscription";
import { useSoundEnabled } from "@/hooks/use-sound-enabled";
import { toast } from "sonner";
import { TypographyH2, TypographyMuted } from "@/components/ui/typography";

const VIEW_TABS: { key: OrderView; label: string; icon: React.ReactNode }[] = [
  { key: "comptoir", label: "Comptoir", icon: <Monitor className="h-4 w-4" /> },
  { key: "cuisine", label: "Cuisine", icon: <ChefHat className="h-4 w-4" /> },
];

export default function AdminDashboard() {
  const params = useParams<{ publicId: string }>();
  const searchParams = useSearchParams();
  const publicId = params.publicId;
  const [orders, setOrders] = useState<Order[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const { playAlert } = useNewOrderAlert();
  const { enabled: soundEnabled, toggle: toggleSound } = useSoundEnabled();
  const { isSupported: pushSupported, isSubscribed: pushSubscribed, loading: pushLoading, subscribe: pushSubscribe } =
    usePushSubscription();

  const handlePushToggle = async () => {
    if (!restaurantId) return;
    const ok = await pushSubscribe({ restaurantId, role: "admin" });
    if (ok) {
      toast.success("Notifications push activées");
    } else {
      toast.error("Impossible d'activer les notifications");
    }
  };

  const [view, setView] = useState<OrderView>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("admin-order-view") as OrderView) || "comptoir";
    }
    return "comptoir";
  });

  const handleViewChange = (newView: OrderView) => {
    setView(newView);
    localStorage.setItem("admin-order-view", newView);
  };

  useEffect(() => {
    if (searchParams.get("welcome") === "true") {
      setShowWelcome(true);
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    }
  }, [searchParams]);

  // Fetch restaurant ID and initial orders
  useEffect(() => {
    const supabase = createClient();

    const init = async () => {
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id")
        .eq("public_id", publicId)
        .single();

      if (!restaurant) return;
      setRestaurantId(restaurant.id);

      // Fetch today's active orders
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: todayOrders } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .gte("created_at", today.toISOString())
        .in("status", ["new", "preparing", "ready"])
        .order("created_at", { ascending: false })
        .returns<Order[]>();

      setOrders(todayOrders || []);
      setLoading(false);
    };

    init();
  }, [publicId]);

  // Realtime subscription
  useEffect(() => {
    if (!restaurantId) return;

    const supabase = createClient();

    const channel = supabase
      .channel("admin-orders")
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
          setOrders((prev) => [newOrder, ...prev]);
          if (soundEnabled) playAlert();
        }
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
            if (updated.status === "done" || updated.status === "cancelled") {
              return prev.filter((o) => o.id !== updated.id);
            }
            return prev.map((o) => (o.id === updated.id ? updated : o));
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, playAlert, soundEnabled]);

  const paidOrders = orders.filter((o) => o.paid);
  const unpaidOrders = orders.filter((o) => !o.paid && o.payment_method === "on_site");

  const newOrders = paidOrders.filter((o) => o.status === "new");
  const preparingOrders = paidOrders.filter((o) => o.status === "preparing");
  const readyOrders = paidOrders.filter((o) => o.status === "ready");

  const activeOrders =
    view === "cuisine"
      ? [...newOrders, ...preparingOrders]
      : [...unpaidOrders, ...paidOrders.filter((o) => ["new", "preparing", "ready"].includes(o.status))];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="px-4 py-4 md:px-6">
      {showWelcome && (
        <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
          <PartyPopper className="mx-auto mb-3 h-10 w-10 text-primary" />
          <TypographyH2 className="mb-1">Restaurant créé !</TypographyH2>
          <TypographyMuted className="mb-4">
            Ajoutez vos premiers articles pour commencer à recevoir des commandes.
          </TypographyMuted>
          <Link href={`/admin/${publicId}/menu`}>
            <Button className="rounded-xl font-semibold">
              Créer mes articles
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}

      {/* View toggle + notifications + fullscreen launchers */}
      <div className="no-scrollbar mb-4 flex items-center gap-1">
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleViewChange(tab.key)}
            className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              view === tab.key
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-1">
          <a
            href={`/kitchen/${publicId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            title="Ouvrir l'écran cuisine plein écran"
          >
            <ChefHat className="h-4 w-4" />
            <span className="hidden sm:inline">Cuisine</span>
            <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href={`/display/${publicId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            title="Ouvrir l'écran client plein écran"
          >
            <Tv className="h-4 w-4" />
            <span className="hidden sm:inline">Écran client</span>
            <ExternalLink className="h-3 w-3" />
          </a>

          <button
            onClick={toggleSound}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
              soundEnabled
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
            title={soundEnabled ? "Couper le son des nouvelles commandes" : "Activer le son des nouvelles commandes"}
            aria-label={soundEnabled ? "Couper le son" : "Activer le son"}
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </button>

          {pushSupported && (
            <button
              onClick={handlePushToggle}
              disabled={pushSubscribed || pushLoading}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                pushSubscribed
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
              title={pushSubscribed ? "Notifications activées" : "Activer les notifications push"}
            >
              {pushSubscribed ? (
                <Bell className="h-4 w-4" />
              ) : (
                <BellOff className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {activeOrders.length === 0 && !showWelcome ? (
        <div className="flex h-64 items-center justify-center">
          <TypographyMuted>
            {view === "cuisine"
              ? "Aucune commande à préparer. Les nouvelles commandes apparaîtront ici."
              : "Aucune commande en cours. Les nouvelles commandes apparaîtront ici en temps réel."}
          </TypographyMuted>
        </div>
      ) : activeOrders.length > 0 ? (
        view === "comptoir" ? (
          <CounterView
            unpaidOrders={unpaidOrders}
            newOrders={newOrders}
            preparingOrders={preparingOrders}
            readyOrders={readyOrders}
          />
        ) : (
          <KitchenView
            newOrders={newOrders}
            preparingOrders={preparingOrders}
          />
        )
      ) : null}
    </div>
  );
}
