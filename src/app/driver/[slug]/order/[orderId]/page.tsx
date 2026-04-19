"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Phone,
  CheckCircle2,
  XCircle,
  Package,
} from "lucide-react";
import type { Order, DeliveryStatus } from "@/lib/types";
import { DELIVERY_STATUS_CONFIG } from "@/lib/constants";

export default function DriverOrderDetailPage() {
  const params = useParams<{ slug: string; orderId: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/driver/deliveries?restaurant_slug=${encodeURIComponent(params.slug)}`
      );
      if (res.status === 401) {
        router.push("/driver/login");
        return;
      }
      const data = await res.json();
      const found = (data.orders || []).find(
        (o: Order) => o.id === params.orderId
      );
      setOrder(found || null);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [params.slug, params.orderId, router]);

  useEffect(() => {
    load();
  }, [load]);

  const advance = async (status: DeliveryStatus) => {
    setMutating(true);
    try {
      const res = await fetch(
        `/api/driver/deliveries/${params.orderId}/status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Statut mis à jour");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
    setMutating(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
        Commande introuvable.{" "}
        <Link href={`/driver/${params.slug}`} className="text-primary">
          Retour
        </Link>
      </div>
    );
  }

  const addr = order.delivery_address;
  const mapsUrl = addr
    ? `https://www.google.com/maps/dir/?api=1&destination=${addr.lat},${addr.lng}`
    : null;
  const statusCfg = order.delivery_status
    ? DELIVERY_STATUS_CONFIG[order.delivery_status]
    : null;
  const customer = (order.customer_info || {}) as Record<string, string>;

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <Link
          href={`/driver/${params.slug}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-sm font-bold">
            {order.display_order_number || order.id.slice(0, 6)}
          </p>
          {statusCfg && (
            <p className="text-xs text-muted-foreground">{statusCfg.label}</p>
          )}
        </div>
      </header>

      <div className="space-y-4 px-4 py-4">
        {/* Address */}
        {addr && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              Adresse de livraison
            </p>
            <p className="text-sm font-medium">{addr.formatted}</p>
            {addr.floor_notes && (
              <p className="mt-1 text-xs text-muted-foreground">
                {addr.floor_notes}
              </p>
            )}
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
              >
                <MapPin className="h-3 w-3" />
                Ouvrir dans Maps
              </a>
            )}
          </div>
        )}

        {/* Customer */}
        {(customer.name || customer.phone) && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Client
            </p>
            {customer.name && (
              <p className="text-sm font-medium">{customer.name}</p>
            )}
            {customer.phone && (
              <a
                href={`tel:${customer.phone}`}
                className="mt-1 flex items-center gap-1.5 text-xs text-primary"
              >
                <Phone className="h-3 w-3" />
                {customer.phone}
              </a>
            )}
            {customer.notes && (
              <p className="mt-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                {customer.notes}
              </p>
            )}
          </div>
        )}

        {/* Items */}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Commande
          </p>
          <div className="space-y-1.5">
            {(order.items || []).map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>
                  {item.quantity}× {item.product_name}
                </span>
                <span className="text-muted-foreground">
                  {formatPrice(item.line_total)}
                </span>
              </div>
            ))}
            {order.delivery_fee && order.delivery_fee > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Frais de livraison</span>
                <span>{formatPrice(order.delivery_fee)}</span>
              </div>
            )}
            <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm font-bold">
              <span>Total</span>
              <span className="text-primary">
                {formatPrice(order.total_price)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {order.delivery_status === "assigned" && (
            <Button
              onClick={() => advance("picked_up")}
              disabled={mutating}
              className="h-12 w-full"
              size="lg"
            >
              <Package className="mr-2 h-4 w-4" />
              Commande récupérée
            </Button>
          )}
          {order.delivery_status === "picked_up" && (
            <Button
              onClick={() => advance("delivered")}
              disabled={mutating}
              className="h-12 w-full"
              size="lg"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Livrée au client
            </Button>
          )}
          {(order.delivery_status === "assigned" ||
            order.delivery_status === "picked_up") && (
            <Button
              onClick={() => advance("failed")}
              disabled={mutating}
              variant="outline"
              className="h-10 w-full"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Échec de livraison
            </Button>
          )}
          {order.delivery_status === "delivered" && (
            <p className="rounded-xl bg-green-50 p-4 text-center text-sm font-medium text-green-700">
              ✓ Commande livrée
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
