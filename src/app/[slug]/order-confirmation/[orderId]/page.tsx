import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Order } from "@/lib/types";
import { formatPrice, formatTime } from "@/lib/format";
import { OrderStatusTracker } from "./order-status-tracker";
import { CheckCircle } from "lucide-react";

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ slug: string; orderId: string }>;
}) {
  const { orderId } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single<Order>();

  if (!order) notFound();

  return (
    <div className="mx-auto max-w-lg px-4 py-6 md:px-6">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold">Commande confirmee !</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {order.payment_source === "wallet"
            ? "Paye avec le solde"
            : order.payment_method === "online"
              ? "Paiement en ligne effectue"
              : "A regler sur place"}
        </p>
      </div>

      {/* Order number */}
      <div className="mb-4 rounded-xl border border-border bg-card p-5 text-center shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">
          Commande N&deg;
        </p>
        <p className="text-4xl font-bold text-primary">
          {order.display_order_number || `#${order.order_number}`}
        </p>
        {order.pickup_time && (
          <p className="mt-2 text-sm">
            Retrait prevu a{" "}
            <span className="font-semibold">{formatTime(order.pickup_time)}</span>
          </p>
        )}
      </div>

      {/* Realtime status tracker */}
      <OrderStatusTracker orderId={order.id} initialStatus={order.status} />

      {/* Order summary */}
      <div className="mt-4 rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Recapitulatif</h3>
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between py-1 text-sm">
            <span>
              {item.quantity}x {item.product_name}
              {item.modifiers.length > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({item.modifiers.map((m) => m.modifier_name).join(", ")})
                </span>
              )}
            </span>
            <span className="font-semibold">{formatPrice(item.line_total)}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-border pt-2">
          <span className="font-semibold">Total</span>
          <span className="text-lg font-bold text-primary">
            {formatPrice(order.total_price)}
          </span>
        </div>
      </div>
    </div>
  );
}
