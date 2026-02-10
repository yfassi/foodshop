"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import confetti from "canvas-confetti";
import { createClient } from "@/lib/supabase/client";
import type { Order } from "@/lib/types";
import { OrderCard } from "@/components/orders/order-card";
import { useNewOrderAlert } from "@/components/orders/new-order-alert";
import { PartyPopper, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const slug = params.slug;
  const [orders, setOrders] = useState<Order[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const { playAlert } = useNewOrderAlert();

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
        .eq("slug", slug)
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
  }, [slug]);

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
          playAlert();
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
  }, [restaurantId, playAlert]);

  const newOrders = orders.filter((o) => o.status === "new");
  const preparingOrders = orders.filter((o) => o.status === "preparing");
  const readyOrders = orders.filter((o) => o.status === "ready");

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
          <h2 className="mb-1 text-lg font-bold">Restaurant créé !</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Ajoutez vos premiers articles pour commencer à recevoir des commandes.
          </p>
          <Link href={`/admin/${slug}/menu`}>
            <Button className="rounded-xl font-semibold">
              Créer mes articles
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}

      {orders.length === 0 && !showWelcome ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Aucune commande en cours. Les nouvelles commandes apparaîtront ici
            en temps réel.
          </p>
        </div>
      ) : orders.length > 0 ? (
        <>
          {/* Mobile: stacked layout */}
          <div className="space-y-6 lg:hidden">
            {newOrders.length > 0 && (
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                  Nouvelles ({newOrders.length})
                </h2>
                <div className="space-y-3">
                  {newOrders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              </section>
            )}
            {preparingOrders.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold">
                  En préparation ({preparingOrders.length})
                </h2>
                <div className="space-y-3">
                  {preparingOrders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              </section>
            )}
            {readyOrders.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold">
                  Prêtes ({readyOrders.length})
                </h2>
                <div className="space-y-3">
                  {readyOrders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Desktop: 3-column kanban */}
          <div className="hidden gap-4 lg:grid lg:grid-cols-3">
            <section className="min-h-[200px] rounded-xl bg-red-50/50 p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                Nouvelles ({newOrders.length})
              </h2>
              <div className="space-y-3">
                {newOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            </section>

            <section className="min-h-[200px] rounded-xl bg-amber-50/50 p-4">
              <h2 className="mb-3 text-sm font-semibold">
                En préparation ({preparingOrders.length})
              </h2>
              <div className="space-y-3">
                {preparingOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            </section>

            <section className="min-h-[200px] rounded-xl bg-green-50/50 p-4">
              <h2 className="mb-3 text-sm font-semibold">
                Prêtes ({readyOrders.length})
              </h2>
              <div className="space-y-3">
                {readyOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
