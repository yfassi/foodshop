import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";
import type { Order, Driver } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { OrderStatusTracker } from "./order-status-tracker";
import { Check, UserPlus, ShoppingBag, MessageSquare } from "lucide-react";

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

  // If order is not yet marked as paid but has a Stripe session, verify payment
  if (!order.paid && order.stripe_session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
      if (session.payment_status === "paid") {
        const adminSupabase = createAdminClient();
        await adminSupabase
          .from("orders")
          .update({
            paid: true,
            stripe_payment_intent_id: session.payment_intent as string,
          })
          .eq("id", order.id);
        order.paid = true;
      }
    } catch {
      // Stripe verification failed, webhook will handle it as fallback
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOnSite = order.payment_method === "on_site" && order.payment_source !== "wallet";
  const orderNumber = order.display_order_number || `#${order.order_number}`;
  const orderNumberClean = orderNumber.replace(/^#/, "");
  const orderTypeLabel =
    order.order_type === "dine_in" ? "Sur place" :
    order.order_type === "takeaway" ? "À emporter" :
    order.order_type === "delivery" ? "Livraison" :
    null;

  let driver: Driver | null = null;
  if (order.order_type === "delivery" && order.driver_id) {
    const adminSupabase = createAdminClient();
    const { data: d } = await adminSupabase
      .from("drivers")
      .select("*")
      .eq("id", order.driver_id)
      .single<Driver>();
    if (d) driver = d;
  }

  const orderTime = new Date(order.created_at).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="mx-auto max-w-lg px-4 py-7 md:px-6">
      {/* Success header */}
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-5 grid h-20 w-20 place-items-center rounded-full bg-success-soft text-success">
          <Check className="h-10 w-10" strokeWidth={3} />
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight">
          {order.customer_info?.name
            ? `Merci ${order.customer_info.name} !`
            : "Commande reçue !"}
        </h2>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          {isOnSite
            ? "Votre commande est confirmée. Présentez votre numéro au comptoir."
            : "Votre commande est en cours de préparation."}
        </p>
      </div>

      {/* Receipt — paper-style with mono font and dashed dividers */}
      <div className="mb-4 rounded-2xl border-[1.5px] border-border bg-card p-5 font-mono text-[11px] text-muted-foreground shadow-sm">
        <div className="mb-3 text-center font-mono text-[20px] font-bold tracking-[0.12em] text-foreground">
          # {orderNumberClean}
        </div>
        <div className="space-y-1">
          {orderTypeLabel && (
            <div className="flex justify-between">
              <span>TYPE</span>
              <span className="text-foreground">{orderTypeLabel.toUpperCase()}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>HEURE</span>
            <span className="text-foreground">{orderTime}</span>
          </div>
          {order.payment_source === "wallet" ? (
            <div className="flex justify-between">
              <span>PAIEMENT</span>
              <span className="text-foreground">SOLDE</span>
            </div>
          ) : isOnSite ? (
            <div className="flex justify-between">
              <span>PAIEMENT</span>
              <span className="text-foreground">SUR PLACE</span>
            </div>
          ) : (
            <div className="flex justify-between">
              <span>PAIEMENT</span>
              <span className="text-foreground">CARTE</span>
            </div>
          )}
        </div>
        <hr className="my-3 border-t border-dashed border-border" />
        <div className="space-y-1.5">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between gap-3">
              <span className="truncate text-foreground">
                {item.quantity}× {item.product_name.toUpperCase()}
                {item.is_menu && <span className="ml-1 text-foreground">(MENU)</span>}
              </span>
              <span className="shrink-0 text-foreground">{formatPrice(item.line_total)}</span>
            </div>
          ))}
        </div>
        <hr className="my-3 border-t border-dashed border-border" />
        <div className="flex items-center justify-between text-[14px] font-bold text-foreground">
          <span>TOTAL</span>
          <span>{formatPrice(order.total_price)}</span>
        </div>
      </div>

      {/* Realtime status tracker */}
      <OrderStatusTracker
        orderId={order.id}
        initialStatus={order.status}
        orderType={order.order_type ?? undefined}
        initialDeliveryStatus={order.delivery_status ?? null}
        initialDriver={driver}
      />

      {/* Order notes */}
      {order.customer_info?.notes && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
            Note pour la cuisine
          </h3>
          <p className="text-[13px]">{order.customer_info.notes}</p>
        </div>
      )}

      {/* New order button — outline pill */}
      <div className="mt-5 text-center">
        <Link
          href={`/restaurant/${slug}/order`}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border-[1.5px] border-border bg-background px-5 text-[13px] font-semibold transition-colors hover:bg-muted"
        >
          <ShoppingBag className="h-4 w-4" />
          Nouvelle commande
        </Link>
      </div>

      {/* Sign-up CTA for non-logged-in users */}
      {!user && (
        <div className="mt-5 rounded-2xl border border-border bg-muted/40 p-5 text-center">
          <div className="mx-auto mb-2.5 grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
            <UserPlus className="h-5 w-5" />
          </div>
          <p className="text-[14px] font-bold tracking-tight">
            Créez votre compte fidélité
          </p>
          <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
            Cumulez des points à chaque commande et débloquez des avantages.
          </p>
          <Link
            href={`/restaurant/${slug}/signup`}
            className="mt-3.5 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Créer mon compte
          </Link>
        </div>
      )}

      <p className="mt-5 text-center text-[10px] text-muted-foreground/70">
        Un reçu a été envoyé par email.
      </p>
    </div>
  );
}
