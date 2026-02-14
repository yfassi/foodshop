import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Order } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { OrderStatusTracker } from "./order-status-tracker";
import { CheckCircle, UserPlus } from "lucide-react";

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ slug: string; orderId: string }>;
}) {
  const { slug, orderId } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single<Order>();

  if (!order) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOnSite = order.payment_method === "on_site" && order.payment_source !== "wallet";
  const orderNumber = order.display_order_number || `#${order.order_number}`;
  const orderTypeLabel =
    order.order_type === "dine_in" ? "Sur place" :
    order.order_type === "takeaway" ? "À emporter" :
    null;

  return (
    <div className="mx-auto max-w-lg px-4 py-6 md:px-6">
      {/* Success header */}
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold">Commande confirmée !</h2>
      </div>

      {/* Order number + payment instruction */}
      <div className="mb-4 rounded-xl border border-border bg-card p-5 text-center shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">
          Votre numéro de commande
        </p>
        <p className="mt-1 text-4xl font-bold text-primary">{orderNumber}</p>
        {orderTypeLabel && (
          <span className="mt-2 inline-block rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {orderTypeLabel}
          </span>
        )}
        <p className="mt-3 text-sm text-muted-foreground">
          {isOnSite ? (
            <>
              Rendez-vous au <span className="font-semibold text-foreground">comptoir</span> et
              communiquez votre numéro{" "}
              <span className="font-semibold text-foreground">{orderNumber}</span> pour régler
              et récupérer votre commande.
            </>
          ) : order.payment_source === "wallet" ? (
            "Payé avec votre solde. Votre commande est en préparation !"
          ) : (
            "Paiement par carte effectué. Votre commande est en préparation !"
          )}
        </p>
      </div>

      {/* Realtime status tracker */}
      <OrderStatusTracker orderId={order.id} initialStatus={order.status} />

      {/* Order summary */}
      <div className="mt-4 rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
          Récapitulatif
        </h3>
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between py-1 text-sm">
            <span>
              {item.quantity}x {item.product_name}
              {item.is_menu && (
                <span className="ml-1 text-xs font-semibold text-primary">(Menu)</span>
              )}
              {item.modifiers.length > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({item.modifiers.map((m) => m.modifier_name).join(", ")})
                </span>
              )}
            </span>
            <span className="font-semibold">
              {formatPrice(item.line_total)}
            </span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-border pt-2">
          <span className="font-semibold">Total</span>
          <span className="text-lg font-bold text-primary">
            {formatPrice(order.total_price)}
          </span>
        </div>
      </div>

      {/* Sign-up CTA for non-logged-in users */}
      {!user && (
        <div className="mt-4 rounded-xl border border-border bg-primary/5 p-4 text-center shadow-sm">
          <UserPlus className="mx-auto mb-2 h-6 w-6 text-primary" />
          <p className="text-sm font-semibold">
            Créez votre compte fidélité
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Profitez d&apos;offres exceptionnelles et cumulez des avantages à
            chaque commande.
          </p>
          <Link
            href={`/${slug}/signup`}
            className="mt-3 inline-block rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Créer mon compte
          </Link>
        </div>
      )}
    </div>
  );
}
