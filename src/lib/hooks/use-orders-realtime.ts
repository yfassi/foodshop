"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Order } from "@/lib/types";
import { useNewOrderAlert } from "@/components/orders/new-order-alert";
import { useSoundEnabled } from "@/hooks/use-sound-enabled";
import { usePushSubscription } from "@/hooks/use-push-subscription";

/**
 * Shared realtime + polling loader for today's orders.
 * Used by the Commandes layout (KPIs) and each sub-route (comptoir/cuisine/historique).
 *
 * Why both realtime and 5s polling: realtime events are dropped under flaky network
 * conditions, so the poll is a safety net. The status-transition detection (TTS for
 * "ready") works whether the change came from realtime or polling.
 */
export function useOrdersRealtime(publicId: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const { playAlert, announceReady } = useNewOrderAlert();
  const { enabled: soundEnabled, toggle: toggleSound } = useSoundEnabled();
  const push = usePushSubscription();

  const announcedReadyRef = useRef<Set<string>>(new Set());
  const seenOrderIdsRef = useRef<Set<string>>(new Set());
  const orderStatusRef = useRef<Map<string, string>>(new Map());
  const hasInitializedRef = useRef(false);

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

      for (const o of list) {
        seenOrderIdsRef.current.add(o.id);
        orderStatusRef.current.set(o.id, o.status);
        if (!wasInitialized && o.status === "ready") {
          announcedReadyRef.current.add(o.id);
        }
      }
      hasInitializedRef.current = true;

      setOrders(list);
      setLoading(false);
    };

    init();
    const poll = setInterval(init, 5000);
    return () => clearInterval(poll);
  }, [publicId, announceReady, playAlert]);

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
          if (seenOrderIdsRef.current.has(newOrder.id)) return;
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
            if (updated.status === "cancelled") return prev.filter((o) => o.id !== updated.id);
            return prev.map((o) => (o.id === updated.id ? updated : o));
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, playAlert, announceReady, soundEnabled]);

  return {
    orders,
    restaurantId,
    loading,
    sound: { enabled: soundEnabled, toggle: toggleSound },
    push,
  };
}
