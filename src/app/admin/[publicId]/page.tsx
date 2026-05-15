"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import confetti from "canvas-confetti";
import { createClient } from "@/lib/supabase/client";
import type { Order, OrderView } from "@/lib/types";
import { useNewOrderAlert } from "@/components/orders/new-order-alert";
import { CounterView, KitchenView } from "@/components/orders/order-views";
import { CounterOrderSheet } from "@/components/admin/counter-order-sheet";
import { UsbPrintStation } from "@/components/admin/usb-print-station";
import {
  PartyPopper,
  ArrowRight,
  Monitor,
  ChefHat,
  Bell,
  BellOff,
  ExternalLink,
  Tv,
  Volume2,
  VolumeX,
  Inbox,
  ClipboardList,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushSubscription } from "@/hooks/use-push-subscription";
import { useSoundEnabled } from "@/hooks/use-sound-enabled";
import { toast } from "sonner";
import { TypographyH2, TypographyMuted } from "@/components/ui/typography";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { cn } from "@/lib/utils";

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
  const { playAlert, announceReady } = useNewOrderAlert();
  const { enabled: soundEnabled, toggle: toggleSound } = useSoundEnabled();
  // Track which orders we've already announced as ready to avoid duplicate TTS
  const announcedReadyRef = useRef<Set<string>>(new Set());
  // Track which order IDs we've already seen to detect new ones via polling
  const seenOrderIdsRef = useRef<Set<string>>(new Set());
  // Track the last known status per order to detect status transitions via polling
  const orderStatusRef = useRef<Map<string, string>>(new Map());
  // Skip announcement on the very first fetch (page load with existing ready orders)
  const hasInitializedRef = useRef(false);
  const { isSupported: pushSupported, isSubscribed: pushSubscribed, loading: pushLoading, subscribe: pushSubscribe } =
    usePushSubscription();
  const [counterSheetOpen, setCounterSheetOpen] = useState(false);

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
        .in("status", ["new", "preparing", "ready", "done"])
        .order("created_at", { ascending: false })
        .returns<Order[]>();

      const list = todayOrders || [];
      const wasInitialized = hasInitializedRef.current;

      // Detect new INSERTs we missed (paid orders that appeared since last fetch)
      // and status transitions to "ready" we missed.
      if (wasInitialized) {
        let sawNewOrder = false;
        for (const o of list) {
          if (!seenOrderIdsRef.current.has(o.id) && o.paid) {
            sawNewOrder = true;
          }
          const prevStatus = orderStatusRef.current.get(o.id);
          if (
            prevStatus &&
            prevStatus !== "ready" &&
            o.status === "ready" &&
            !announcedReadyRef.current.has(o.id)
          ) {
            announcedReadyRef.current.add(o.id);
            announceReady(o.display_order_number || `#${o.order_number}`);
          }
        }
        if (sawNewOrder) playAlert();
      }

      // Update tracking refs
      for (const o of list) {
        seenOrderIdsRef.current.add(o.id);
        orderStatusRef.current.set(o.id, o.status);
        // Pre-mark currently-ready orders on first load so we don't announce them
        if (!wasInitialized && o.status === "ready") {
          announcedReadyRef.current.add(o.id);
        }
      }
      hasInitializedRef.current = true;

      setOrders(list);
      setLoading(false);
    };

    init();

    // Polling fallback every 5s as a safety net for missed realtime events
    const poll = setInterval(init, 5000);
    return () => clearInterval(poll);
  }, [publicId, announceReady, playAlert]);

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
          if (seenOrderIdsRef.current.has(newOrder.id)) return; // already counted via polling
          seenOrderIdsRef.current.add(newOrder.id);
          orderStatusRef.current.set(newOrder.id, newOrder.status);
          setOrders((prev) => [newOrder, ...prev]);
          if (soundEnabled && newOrder.paid) playAlert();
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
          const prevStatus = orderStatusRef.current.get(updated.id);
          orderStatusRef.current.set(updated.id, updated.status);
          // Detect transition to "ready" → speak it (once per order)
          if (
            prevStatus &&
            prevStatus !== "ready" &&
            updated.status === "ready" &&
            !announcedReadyRef.current.has(updated.id)
          ) {
            announcedReadyRef.current.add(updated.id);
            announceReady(updated.display_order_number || `#${updated.order_number}`);
          }
          setOrders((prev) => {
            if (updated.status === "cancelled") {
              return prev.filter((o) => o.id !== updated.id);
            }
            // Keep "done" orders for the kitchen history view
            return prev.map((o) => (o.id === updated.id ? updated : o));
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, playAlert, announceReady, soundEnabled]);

  const paidOrders = orders.filter((o) => o.paid);
  const unpaidOrders = orders.filter((o) => !o.paid && o.payment_method === "on_site");

  const newOrders = paidOrders.filter((o) => o.status === "new");
  const preparingOrders = paidOrders.filter((o) => o.status === "preparing");
  const readyOrders = paidOrders.filter((o) => o.status === "ready");
  const doneOrders = paidOrders.filter((o) => o.status === "done");

  const activeOrders =
    view === "cuisine"
      ? [...newOrders, ...preparingOrders, ...readyOrders, ...doneOrders]
      : [...unpaidOrders, ...paidOrders.filter((o) => ["new", "preparing", "ready"].includes(o.status))];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const counts = {
    new: newOrders.length,
    preparing: preparingOrders.length,
    ready: readyOrders.length,
    unpaid: unpaidOrders.length,
  };
  const totalActive =
    view === "cuisine"
      ? counts.new + counts.preparing
      : counts.new + counts.preparing + counts.ready + counts.unpaid;

  const subtitle = (() => {
    if (totalActive === 0) return "Tout est calme — les nouvelles commandes apparaissent ici en temps réel.";
    const parts: string[] = [];
    if (view === "comptoir" && counts.unpaid > 0) parts.push(`${counts.unpaid} à encaisser`);
    if (counts.new > 0) parts.push(`${counts.new} nouvelle${counts.new > 1 ? "s" : ""}`);
    if (counts.preparing > 0) parts.push(`${counts.preparing} en préparation`);
    if (view === "comptoir" && counts.ready > 0) parts.push(`${counts.ready} prête${counts.ready > 1 ? "s" : ""}`);
    return parts.join(" · ");
  })();

  return (
    <div className="px-4 py-6 md:px-6">
      {/* WebUSB bridge for kind='usb_thermal' printers. Renders nothing when
          the restaurant has no USB printer or the browser lacks WebUSB. */}
      {restaurantId && <UsbPrintStation restaurantId={restaurantId} />}

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

      <AdminPageHeader
        kicker="Service en cours"
        icon={ClipboardList}
        title={
          <span className="inline-flex items-baseline gap-2">
            Commandes
            {totalActive > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                {totalActive}
              </span>
            )}
          </span>
        }
        subtitle={subtitle}
        actions={
          <div className="flex items-center gap-1">
            {view === "comptoir" && (
              <button
                onClick={() => setCounterSheetOpen(true)}
                className="flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Nouvelle commande</span>
              </button>
            )}
            <a
              href={`/kitchen/${publicId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
              title="Ouvrir l'écran cuisine plein écran"
            >
              <ChefHat className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Cuisine</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href={`/display/${publicId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
              title="Ouvrir l'écran client plein écran"
            >
              <Tv className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Écran client</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <button
              onClick={toggleSound}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
                soundEnabled
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
              title={soundEnabled ? "Couper le son des nouvelles commandes" : "Activer le son des nouvelles commandes"}
              aria-label={soundEnabled ? "Couper le son" : "Activer le son"}
            >
              {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </button>
            {pushSupported && (
              <button
                onClick={handlePushToggle}
                disabled={pushSubscribed || pushLoading}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border transition-colors",
                  pushSubscribed
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                )}
                title={pushSubscribed ? "Notifications activées" : "Activer les notifications push"}
                aria-label={pushSubscribed ? "Notifications actives" : "Activer notifications push"}
              >
                {pushSubscribed ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
        }
      >
        {/* Service-mode toggle — primary tool during service. */}
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-0.5 shadow-sm">
          {VIEW_TABS.map((tab) => {
            const isActive = view === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleViewChange(tab.key)}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>
      </AdminPageHeader>

      <CounterOrderSheet
        open={counterSheetOpen}
        onClose={() => setCounterSheetOpen(false)}
        publicId={publicId}
      />

      {activeOrders.length === 0 && !showWelcome ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Inbox className="h-5 w-5" />
          </div>
          <p className="mb-1 text-sm font-medium text-foreground">
            {view === "cuisine" ? "Cuisine au calme" : "Aucune commande en cours"}
          </p>
          <p className="max-w-xs text-xs text-muted-foreground">
            {view === "cuisine"
              ? "Les bons à préparer apparaîtront ici dès qu'une commande arrive."
              : "Les nouvelles commandes apparaissent ici en temps réel, avec une alerte sonore."}
          </p>
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
            readyOrders={readyOrders}
            doneOrders={doneOrders}
          />
        )
      ) : null}
    </div>
  );
}
