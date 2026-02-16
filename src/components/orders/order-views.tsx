"use client";

import type { Order } from "@/lib/types";
import { OrderCard } from "./order-card";

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
}

export function KitchenView({
  newOrders,
  preparingOrders,
}: KitchenViewProps) {
  return (
    <>
      {/* Mobile: stacked layout */}
      <div className="space-y-6 lg:hidden">
        {newOrders.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
              <span className="h-3 w-3 animate-pulse rounded-full bg-orange-500" />
              À préparer ({newOrders.length})
            </h2>
            <div className="space-y-3">
              {newOrders.map((order) => (
                <OrderCard key={order.id} order={order} view="cuisine" />
              ))}
            </div>
          </section>
        )}
        {preparingOrders.length > 0 && (
          <section>
            <h2 className="mb-3 text-base font-bold">
              En cours ({preparingOrders.length})
            </h2>
            <div className="space-y-3">
              {preparingOrders.map((order) => (
                <OrderCard key={order.id} order={order} view="cuisine" />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Desktop: 2-column kanban */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-2">
        <section className="min-h-[200px] rounded-xl bg-orange-50/50 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
            <span className="h-3 w-3 animate-pulse rounded-full bg-orange-500" />
            À préparer ({newOrders.length})
          </h2>
          <div className="space-y-3">
            {newOrders.map((order) => (
              <OrderCard key={order.id} order={order} view="cuisine" />
            ))}
          </div>
        </section>

        <section className="min-h-[200px] rounded-xl bg-amber-50/50 p-4">
          <h2 className="mb-3 text-base font-bold">
            En cours ({preparingOrders.length})
          </h2>
          <div className="space-y-3">
            {preparingOrders.map((order) => (
              <OrderCard key={order.id} order={order} view="cuisine" />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
