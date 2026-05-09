"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Bike,
  Loader2,
  MapPin,
  Clock,
  LogOut,
  Wallet,
  ChevronRight,
} from "lucide-react";
import type { Order, Driver } from "@/lib/types";
import { DELIVERY_STATUS_CONFIG } from "@/lib/constants";

export default function DriverDeliveriesPage() {
  const params = useParams<{ publicId: string }>();
  const router = useRouter();
  const publicId = params.publicId;
  const [orders, setOrders] = useState<Order[]>([]);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/driver/deliveries?restaurant_public_id=${encodeURIComponent(publicId)}`
      );
      if (res.status === 401) {
        router.push("/driver/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrders(data.orders || []);
      setDriver(data.driver || null);
      setRestaurantName(data.restaurant?.name || "");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
    setLoading(false);
  }, [publicId, router]);

  useEffect(() => {
    load();
    const supabase = createClient();
    const channel = supabase
      .channel(`driver-${publicId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [publicId, load]);

  const claim = async (orderId: string) => {
    try {
      const res = await fetch(
        `/api/driver/deliveries/${orderId}/claim`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      toast.success("Commande prise en charge");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  };

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/driver/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const toClaim = orders.filter(
    (o) => !o.driver_id || o.delivery_status === "pending"
  );
  const mine = orders.filter(
    (o) =>
      driver &&
      o.driver_id === driver.id &&
      o.delivery_status !== "delivered" &&
      o.delivery_status !== "failed"
  );
  const done = orders.filter(
    (o) =>
      driver &&
      o.driver_id === driver.id &&
      (o.delivery_status === "delivered" || o.delivery_status === "failed")
  );

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bike className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold">{restaurantName}</p>
            <p className="text-xs text-muted-foreground">
              {mine.length} en cours · {done.length} livrées
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/driver/${publicId}/earnings`}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
          >
            <Wallet className="h-4 w-4" />
          </Link>
          <button
            onClick={logout}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="space-y-5 px-4 py-4">
        <Section title="À prendre">
          {toClaim.length === 0 ? (
            <Empty />
          ) : (
            toClaim.map((o) => (
              <DeliveryCard
                key={o.id}
                order={o}
                               action={
                  <Button size="sm" onClick={() => claim(o.id)} className="h-8">
                    Prendre
                  </Button>
                }
              />
            ))
          )}
        </Section>

        <Section title="En cours">
          {mine.length === 0 ? (
            <Empty />
          ) : (
            mine.map((o) => (
              <Link
                key={o.id}
                href={`/driver/${publicId}/order/${o.id}`}
                className="block"
              >
                <DeliveryCard order={o} />
              </Link>
            ))
          )}
        </Section>

        {done.length > 0 && (
          <Section title="Terminées">
            {done.map((o) => (
              <DeliveryCard key={o.id} order={o} dim />
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Empty() {
  return (
    <p className="rounded-xl border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
      Aucune
    </p>
  );
}

function DeliveryCard({
  order,
  action,
  dim,
}: {
  order: Order;
  action?: React.ReactNode;
  dim?: boolean;
}) {
  const addr = order.delivery_address;
  const statusCfg = order.delivery_status
    ? DELIVERY_STATUS_CONFIG[order.delivery_status]
    : null;
  return (
    <div
      className={`rounded-xl border border-border bg-card p-3 ${dim ? "opacity-60" : ""}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">
          {order.display_order_number || order.id.slice(0, 6)}
        </p>
        <p className="text-sm font-bold text-primary">
          {formatPrice(order.total_price)}
        </p>
      </div>
      {addr?.formatted && (
        <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
          <span className="line-clamp-2">{addr.formatted}</span>
        </p>
      )}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(order.created_at).toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {statusCfg && (
            <span className="font-medium text-foreground">
              {statusCfg.label}
            </span>
          )}
        </div>
        {action || <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </div>
    </div>
  );
}
