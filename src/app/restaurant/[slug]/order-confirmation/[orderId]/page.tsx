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
    <div className="mx-auto max-w-lg bg-[#fdf9f3] px-4 py-7 md:px-6">
      {/* Confirmation header — kit: green disc + Poppins 800 + Caveat accent */}
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-5 grid h-[84px] w-[84px] place-items-center rounded-full bg-[#d8efd9] text-[#008138] shadow-[0_0_0_8px_#d8efd966]">
          <Check className="h-10 w-10" strokeWidth={3} />
        </div>
        <h2 className="text-[26px] font-extrabold tracking-[-0.03em] text-[#1c1410]">
          {order.customer_info?.name
            ? `Merci ${order.customer_info.name} !`
            : "Commande reçue !"}
        </h2>
        <p className="mt-1.5 text-[13px] text-[#68625e]">
          {isOnSite
            ? "Votre commande est confirmée. Présentez votre numéro au comptoir."
            : "Votre commande est en cours de préparation."}
        </p>
      </div>

      {/* Receipt — kit: ticket-paper style, Space Mono, dashed dividers, perforated feel */}
      <div className="mb-4 border border-[#dbd7d2] bg-white p-5 font-mono text-[11px] text-[#68625e] shadow-[0_12px_28px_-14px_#1c141033]">
        <div className="mb-3 text-center font-mono text-[20px] font-bold tracking-[0.14em] text-[#1c1410]">
          # {orderNumberClean}
        </div>
        <div className="space-y-0.5">
          {orderTypeLabel && (
            <div className="flex justify-between py-0.5">
              <span>TYPE</span>
              <span className="text-[#1c1410]">{orderTypeLabel.toUpperCase()}</span>
            </div>
          )}
          <div className="flex justify-between py-0.5">
            <span>HEURE</span>
            <span className="text-[#1c1410]">{orderTime}</span>
          </div>
          {order.payment_source === "wallet" ? (
            <div className="flex justify-between py-0.5">
              <span>PAIEMENT</span>
              <span className="text-[#1c1410]">SOLDE</span>
            </div>
          ) : isOnSite ? (
            <div className="flex justify-between py-0.5">
              <span>PAIEMENT</span>
              <span className="text-[#1c1410]">SUR PLACE</span>
            </div>
          ) : (
            <div className="flex justify-between py-0.5">
              <span>PAIEMENT</span>
              <span className="text-[#1c1410]">CARTE</span>
            </div>
          )}
        </div>
        {/* Dashed divider — kit: repeating gradient */}
        <div
          className="my-2.5"
          style={{
            height: 1,
            background: "repeating-linear-gradient(to right, #dbd7d2 0, #dbd7d2 4px, transparent 4px, transparent 8px)",
          }}
        />
        <div className="space-y-1">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between gap-3 py-0.5">
              <span className="truncate text-[#1c1410]">
                {item.quantity}× {item.product_name.toUpperCase()}
                {item.is_menu && <span className="ml-1">(MENU)</span>}
              </span>
              <span className="shrink-0 text-[#1c1410]">{formatPrice(item.line_total)}</span>
            </div>
          ))}
        </div>
        <div
          className="my-2.5"
          style={{
            height: 1,
            background: "repeating-linear-gradient(to right, #dbd7d2 0, #dbd7d2 4px, transparent 4px, transparent 8px)",
          }}
        />
        <div className="flex items-center justify-between text-[14px] font-bold text-[#1c1410]">
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
        <div className="mt-4 rounded-[14px] border border-[#dbd7d2] bg-white p-4">
          <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#68625e]">
            <MessageSquare className="h-3.5 w-3.5" />
            Note pour la cuisine
          </h3>
          <p className="text-[13px] text-[#1c1410]">{order.customer_info.notes}</p>
        </div>
      )}

      {/* New order button — kit: outline pill */}
      <div className="mt-5 text-center">
        <Link
          href={`/restaurant/${slug}/order`}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border-[1.5px] border-[#1c1410] bg-transparent px-5 text-[13px] font-bold uppercase tracking-[0.06em] text-[#1c1410] transition-colors hover:bg-[#1c1410] hover:text-white"
        >
          <ShoppingBag className="h-4 w-4" />
          Nouvelle commande
        </Link>
      </div>

      {/* Sign-up CTA for non-logged-in users */}
      {!user && (
        <div className="mt-5 rounded-[14px] border border-[#dbd7d2] bg-white p-5 text-center">
          <div className="mx-auto mb-2.5 grid h-10 w-10 place-items-center rounded-full bg-[#172846] text-white">
            <UserPlus className="h-5 w-5" />
          </div>
          <p className="text-[14px] font-bold tracking-[-0.02em] text-[#1c1410]">
            Créez votre compte fidélité
          </p>
          <p className="mt-1 text-[12px] leading-snug text-[#68625e]">
            Cumulez des points à chaque commande et débloquez des avantages.
          </p>
          <Link
            href={`/restaurant/${slug}/signup`}
            className="mt-3.5 inline-flex h-10 items-center justify-center rounded-full bg-[#d7352d] px-5 text-[13px] font-bold uppercase tracking-[0.06em] text-white shadow-[0_0_20px_#d7352d4d] transition-colors hover:bg-[#bf2c25]"
          >
            Créer mon compte
          </Link>
        </div>
      )}

      <p className="mt-5 text-center text-[11px] text-[#a89e94]">
        Un reçu a été envoyé par email.
      </p>
    </div>
  );
}
