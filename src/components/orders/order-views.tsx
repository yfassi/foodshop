"use client";

import { useState } from "react";
import type { Order } from "@/lib/types";
import { OrderCard } from "./order-card";
import { KitchenTicket } from "./kitchen-ticket";

interface CounterViewProps {
  unpaidOrders: Order[];
  newOrders: Order[];
  preparingOrders: Order[];
  readyOrders: Order[];
}

export function CounterView({
  unpaidOrders,
  newOrders,
  preparingOrders,
  readyOrders,
}: CounterViewProps) {
  return (
    <>
      {/* Mobile: stacked layout */}
      <div className="space-y-6 lg:hidden">
        {unpaidOrders.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-500" />
              À encaisser ({unpaidOrders.length})
            </h2>
            <div className="space-y-3">
              {unpaidOrders.map((order) => (
                <OrderCard key={order.id} order={order} view="comptoir" />
              ))}
            </div>
          </section>
        )}
        {newOrders.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-orange-500" />
              Nouvelles ({newOrders.length})
            </h2>
            <div className="space-y-3">
              {newOrders.map((order) => (
                <OrderCard key={order.id} order={order} view="comptoir" />
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
                <OrderCard key={order.id} order={order} view="comptoir" />
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
                <OrderCard key={order.id} order={order} view="comptoir" />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Desktop: kanban */}
      <div className="hidden flex-col gap-4 lg:flex">
        {unpaidOrders.length > 0 && (
          <section className="rounded-xl bg-blue-50/50 p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-500" />
              À encaisser ({unpaidOrders.length})
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {unpaidOrders.map((order) => (
                <OrderCard key={order.id} order={order} view="comptoir" />
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <section className="min-h-[200px] rounded-xl bg-orange-50/50 p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-orange-500" />
              Nouvelles ({newOrders.length})
            </h2>
            <div className="space-y-3">
              {newOrders.map((order) => (
                <OrderCard key={order.id} order={order} view="comptoir" />
              ))}
            </div>
          </section>

          <section className="min-h-[200px] rounded-xl bg-amber-50/50 p-4">
            <h2 className="mb-3 text-sm font-semibold">
              En préparation ({preparingOrders.length})
            </h2>
            <div className="space-y-3">
              {preparingOrders.map((order) => (
                <OrderCard key={order.id} order={order} view="comptoir" />
              ))}
            </div>
          </section>

          <section className="min-h-[200px] rounded-xl bg-green-50/50 p-4">
            <h2 className="mb-3 text-sm font-semibold">
              Prêtes ({readyOrders.length})
            </h2>
            <div className="space-y-3">
              {readyOrders.map((order) => (
                <OrderCard key={order.id} order={order} view="comptoir" />
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

interface KitchenViewProps {
  newOrders: Order[];
  preparingOrders: Order[];
  readyOrders: Order[];
  doneOrders: Order[];
}

export function KitchenView({
  newOrders,
  preparingOrders,
  readyOrders,
  doneOrders,
}: KitchenViewProps) {
  const [extraTab, setExtraTab] = useState<"ready" | "history" | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {/* ─── À préparer (top lane) ─── */}
      <KitchenLane
        title="À préparer"
        accent="orange"
        orders={newOrders}
        emptyHint="Aucune commande à préparer."
      />

      {/* ─── En cours (bottom lane) ─── */}
      <KitchenLane
        title="En cours"
        accent="amber"
        orders={preparingOrders}
        emptyHint="Aucune commande en préparation."
      />

      {/* ─── Footer toggles: Prêtes & Historique ─── */}
      <div className="mt-2 flex items-center gap-2 border-t border-border pt-3">
        <button
          type="button"
          onClick={() => setExtraTab((t) => (t === "ready" ? null : "ready"))}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            extraTab === "ready"
              ? "bg-green-600 text-white"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Prêtes ({readyOrders.length})
        </button>
        <button
          type="button"
          onClick={() => setExtraTab((t) => (t === "history" ? null : "history"))}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            extraTab === "history"
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-gray-500" />
          Historique ({doneOrders.length})
        </button>
      </div>

      {extraTab === "ready" && (
        <KitchenLane
          title="Prêtes"
          accent="green"
          orders={readyOrders}
          compact
          emptyHint="Aucune commande prête."
        />
      )}
      {extraTab === "history" && (
        <KitchenLane
          title="Historique du jour"
          accent="gray"
          orders={doneOrders}
          compact
          locked
          emptyHint="Aucune commande terminée aujourd'hui."
        />
      )}
    </div>
  );
}

function KitchenLane({
  title,
  accent,
  orders,
  emptyHint,
  compact = false,
  locked = false,
}: {
  title: string;
  accent: "orange" | "amber" | "green" | "gray";
  orders: Order[];
  emptyHint: string;
  compact?: boolean;
  locked?: boolean;
}) {
  const accentColor = {
    orange: "bg-orange-500",
    amber: "bg-amber-500",
    green: "bg-green-500",
    gray: "bg-gray-400",
  }[accent];

  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground">
        <span
          className={`h-2.5 w-2.5 rounded-full ${accentColor} ${
            accent === "orange" || accent === "amber" ? "animate-pulse" : ""
          }`}
        />
        {title}
        <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
          {orders.length}
        </span>
      </h2>
      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-xs text-muted-foreground">
          {emptyHint}
        </div>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-2 md:-mx-6 md:px-6">
          <div className="flex snap-x snap-mandatory gap-3">
            {orders.map((order) => (
              <div key={order.id} className="snap-start shrink-0">
                <KitchenTicket order={order} compact={compact} locked={locked} />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
