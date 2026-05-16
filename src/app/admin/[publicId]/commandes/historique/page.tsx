"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { OrderCard } from "@/components/orders/order-card";
import { useOrders, selectBuckets } from "../_components/orders-context";
import { EmptyOrdersState } from "../_components/commandes-shell";

export default function HistoriquePage() {
  const { orders, loading } = useOrders();
  const b = useMemo(() => selectBuckets(orders), [orders]);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return b.done;
    const q = query.toLowerCase();
    return b.done.filter((o) => {
      const num = (o.display_order_number || String(o.order_number)).toLowerCase();
      const name = (o.customer_info?.name || "").toLowerCase();
      return num.includes(q) || name.includes(q);
    });
  }, [b.done, query]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (b.done.length === 0) return <EmptyOrdersState view="historique" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Commandes terminées · {b.done.length}
        </h2>
        <div className="relative w-full sm:w-64">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher…"
            className="h-9 w-full rounded-lg border border-2-tk bg-card px-3 pr-9 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Effacer la recherche"
              className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((o) => (
          <OrderCard key={o.id} order={o} view="comptoir" />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
            Aucune commande trouvée pour « {query} ».
          </p>
        )}
      </div>
    </div>
  );
}
