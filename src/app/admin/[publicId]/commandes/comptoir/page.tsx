"use client";

import { useMemo } from "react";
import { CounterView } from "@/components/orders/order-views";
import { useOrders, selectBuckets } from "../_components/orders-context";
import { EmptyOrdersState } from "../_components/commandes-shell";

export default function ComptoirPage() {
  const { orders, loading } = useOrders();
  const b = useMemo(() => selectBuckets(orders), [orders]);
  const total = b.unpaid.length + b.new.length + b.preparing.length + b.ready.length;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (total === 0) return <EmptyOrdersState view="comptoir" />;

  return (
    <CounterView
      unpaidOrders={b.unpaid}
      newOrders={b.new}
      preparingOrders={b.preparing}
      readyOrders={b.ready}
    />
  );
}
