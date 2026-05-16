"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bike, MapPin, Phone, Loader2 } from "lucide-react";
import type { Order, Driver } from "@/lib/types";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ElapsedBadge } from "@/components/admin/ui/elapsed-badge";
import { useElapsedMinutes } from "@/lib/hooks/use-elapsed";

type OrderWithDriver = Order & { driver?: Driver | null };

export default function DeliveryBoardPage() {
  const params = useParams<{ publicId: string }>();
  const publicId = params.publicId;
  const [orders, setOrders] = useState<OrderWithDriver[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async (resId: string) => {
    const supabase = createClient();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { data: ordersData } = await supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", resId)
      .eq("order_type", "delivery")
      .gte("created_at", startOfDay.toISOString())
      .order("created_at", { ascending: true })
      .returns<Order[]>();

    const { data: driversData } = await supabase
      .from("drivers")
      .select("*")
      .eq("restaurant_id", resId)
      .returns<Driver[]>();

    const driversMap: Record<string, Driver> = {};
    (driversData || []).forEach((d) => {
      driversMap[d.id] = d;
    });

    setOrders(
      (ordersData || []).map((o) => ({
        ...o,
        driver: o.driver_id ? driversMap[o.driver_id] || null : null,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id")
        .eq("public_id", publicId)
        .single();
      if (!restaurant) return;
      await loadOrders(restaurant.id);

      const channel = supabase
        .channel(`delivery-board-${restaurant.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `restaurant_id=eq.${restaurant.id}`,
          },
          () => loadOrders(restaurant.id)
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };
    init();
  }, [publicId, loadOrders]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const toAssign = orders.filter((o) => !o.driver_id);
  const inProgress = orders.filter(
    (o) =>
      o.driver_id &&
      (o.delivery_status === "assigned" || o.delivery_status === "picked_up")
  );
  const delivered = orders.filter((o) => o.delivery_status === "delivered");

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker="Service du jour"
        icon={Bike}
        title="Livraison"
        subtitle={`${toAssign.length} à assigner · ${inProgress.length} en cours · ${delivered.length} livrée${delivered.length > 1 ? "s" : ""}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Column title="À assigner" count={toAssign.length}>
          {toAssign.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
          {toAssign.length === 0 && <Empty label="Aucune" />}
        </Column>
        <Column title="En cours" count={inProgress.length}>
          {inProgress.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
          {inProgress.length === 0 && <Empty label="Aucune" />}
        </Column>
        <Column title="Livrées" count={delivered.length}>
          {delivered.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
          {delivered.length === 0 && <Empty label="Aucune" />}
        </Column>
      </div>
    </div>
  );
}

function Column({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">{title}</p>
        <Badge variant="secondary">{count}</Badge>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <p className="py-6 text-center text-xs text-muted-foreground">{label}</p>
  );
}

function OrderCard({ order }: { order: OrderWithDriver }) {
  const addr = order.delivery_address;
  const elapsedMin = useElapsedMinutes(order.created_at);
  return (
    <Card size="sm">
      <CardContent className="space-y-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">
            {order.display_order_number || order.id.slice(0, 6)}
          </p>
          <p className="text-sm font-bold text-primary">
            {formatPrice(order.total_price)}
          </p>
        </div>
        {order.created_at && (
          <ElapsedBadge minutes={elapsedMin} />
        )}
        {addr && (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
            <span className="line-clamp-2">{addr.formatted}</span>
          </p>
        )}
        {order.driver && (
          <p className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-foreground">
            <Phone className="h-3 w-3 shrink-0" />
            <span>{order.driver.full_name}</span>
            {order.driver.phone && (
              <>
                <span aria-hidden>·</span>
                <a
                  href={`tel:${order.driver.phone}`}
                  className="rounded px-1 py-0.5 underline-offset-2 hover:bg-accent hover:underline"
                >
                  {order.driver.phone}
                </a>
              </>
            )}
          </p>
        )}
        {order.delivery_status && (
          <Badge variant="outline" className="text-[10px]">
            {order.delivery_status}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
