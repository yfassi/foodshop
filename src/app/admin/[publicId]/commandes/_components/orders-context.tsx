"use client";

import { createContext, useContext } from "react";
import type { Order } from "@/lib/types";
import type { useOrdersRealtime } from "@/lib/hooks/use-orders-realtime";

type OrdersValue = ReturnType<typeof useOrdersRealtime>;

const OrdersContext = createContext<OrdersValue | null>(null);

export function OrdersProvider({
  value,
  children,
}: {
  value: OrdersValue;
  children: React.ReactNode;
}) {
  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrders(): OrdersValue {
  const ctx = useContext(OrdersContext);
  if (!ctx) {
    throw new Error("useOrders must be used inside <OrdersProvider> (commandes/layout)");
  }
  return ctx;
}

export function selectBuckets(orders: Order[]) {
  const paid = orders.filter((o) => o.paid);
  const unpaid = orders.filter((o) => !o.paid && o.payment_method === "on_site");
  return {
    unpaid,
    new: paid.filter((o) => o.status === "new"),
    preparing: paid.filter((o) => o.status === "preparing"),
    ready: paid.filter((o) => o.status === "ready"),
    done: paid.filter((o) => o.status === "done"),
  };
}
