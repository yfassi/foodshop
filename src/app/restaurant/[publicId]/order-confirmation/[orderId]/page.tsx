import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeForDemo } from "@/lib/stripe/demo";
import type { Order, Driver } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { OrderStatusTracker } from "./order-status-tracker";
import { EmailReceiptForm } from "./email-receipt-form";
import { Check, UserPlus, ShoppingBag, MessageSquare, FlaskConical } from "lucide-react";
import "./order-confirmation.css";

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ publicId: string; orderId: string }>;
}) {
  const { publicId, orderId } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single<Order>();

  if (!order) notFound();

  if (!order.paid && order.stripe_session_id) {
    try {
      const stripeClient = getStripeForDemo(order.is_demo);
      const session = await stripeClient.checkout.sessions.retrieve(order.stripe_session_id);
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
      // webhook fallback
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
  const orderDate = new Date(order.created_at).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const paymentLabel =
    order.payment_source === "wallet" ? "Solde"
    : isOnSite ? "Sur place"
    : "Carte";

  const customerName = order.customer_info?.name?.split(" ")[0];

  // Show the "send receipt by email" form when no email is on file and we
  // haven't already sent a confirmation. Cast to read the column added in
  // migration 019 without expanding the global Order type.
  const emailSentAt = (order as Order & {
    confirmation_email_sent_at?: string | null;
  }).confirmation_email_sent_at;
  const showEmailReceiptForm =
    !order.customer_info?.email && !emailSentAt;

  return (
    <div className="oc-root">
      <div className="oc-wrap">
        {order.is_demo && (
          <div className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-800">
            <FlaskConical className="h-3.5 w-3.5" />
            Mode démo — paiement Stripe test
          </div>
        )}
        {/* ──── Header ──── */}
        <header className="oc-header">
          <div className="oc-stamp" aria-hidden>
            <Check className="h-9 w-9" strokeWidth={3} />
          </div>
          <h1 className="oc-title">
            {customerName ? <>Merci <em>{customerName}</em>&nbsp;!</> : <>Commande <em>reçue</em>&nbsp;!</>}
          </h1>
          <p className="oc-sub">
            {isOnSite
              ? "Présentez votre numéro au comptoir, on s'occupe du reste."
              : "On s'occupe de tout. Vous serez notifié dès que votre commande est prête."}
          </p>
        </header>

        {/* ──── Realtime status (lifted to top of page) ──── */}
        <OrderStatusTracker
          orderId={order.id}
          initialStatus={order.status}
          orderType={order.order_type ?? undefined}
          initialDeliveryStatus={order.delivery_status ?? null}
          initialDriver={driver}
        />

        {/* ──── Receipt ──── */}
        <section className="oc-receipt" aria-label="Ticket de caisse">
          <p className="oc-receipt-tag">Ticket de caisse · {orderDate}</p>

          <div className="oc-receipt-num">
            <small>Numéro de commande</small>
            #{orderNumberClean}
          </div>

          <hr className="oc-divider" />

          <div className="oc-meta">
            {orderTypeLabel && (
              <div className="oc-meta-row">
                <span className="l">Type</span>
                <span className="v">{orderTypeLabel}</span>
              </div>
            )}
            <div className="oc-meta-row">
              <span className="l">Heure</span>
              <span className="v">{orderTime}</span>
            </div>
            <div className="oc-meta-row">
              <span className="l">Paiement</span>
              <span className="v">{paymentLabel}</span>
            </div>
          </div>

          <hr className="oc-divider" />

          <div className="oc-items">
            {order.items.map((item, i) => (
              <div key={i}>
                <div className="oc-item-row">
                  <span className="oc-item-name">
                    <span className="qty">{item.quantity}×</span>
                    {item.product_name}
                    {item.is_menu && <span className="menu">(menu)</span>}
                  </span>
                  <span className="oc-item-price">{formatPrice(item.line_total)}</span>
                </div>
                {item.modifiers.length > 0 && (
                  <p className="oc-item-mods">
                    {item.modifiers.map((m) => m.modifier_name).join(" · ")}
                  </p>
                )}
              </div>
            ))}
          </div>

          <hr className="oc-divider" />

          <div className="oc-total">
            <span className="l">Total</span>
            <span className="v">{formatPrice(order.total_price)}</span>
          </div>

          <p className="oc-thanks">À très vite !</p>
        </section>

        {/* ──── Email receipt fallback ──── */}
        {showEmailReceiptForm && <EmailReceiptForm orderId={order.id} />}

        {/* ──── Note ──── */}
        {order.customer_info?.notes && (
          <div className="oc-note">
            <h3 className="oc-note-h">
              <MessageSquare className="h-3 w-3" />
              Note pour la cuisine
            </h3>
            <p className="oc-note-body">{order.customer_info.notes}</p>
          </div>
        )}

        {/* ──── Actions ──── */}
        <div className="oc-actions">
          <Link href={`/restaurant/${publicId}/order`} className="oc-btn oc-btn-ghost">
            <ShoppingBag className="h-4 w-4" />
            Nouvelle commande
          </Link>
        </div>

        {/* ──── Sign-up CTA ──── */}
        {!user && (
          <div className="oc-signup">
            <div className="oc-signup-icon">
              <UserPlus className="h-5 w-5" />
            </div>
            <p className="oc-signup-h">
              Créez votre compte <em>fidélité</em>
            </p>
            <p className="oc-signup-sub">
              Cumulez des points à chaque commande, débloquez des avantages.
            </p>
            <Link href={`/restaurant/${publicId}/signup`} className="oc-signup-cta">
              Créer mon compte
            </Link>
          </div>
        )}

        {/* ──── Powered by TaapR ──── */}
        <footer className="oc-poweredby">
          <a href="https://www.taapr.fr" target="_blank" rel="noopener noreferrer">
            <span className="oc-poweredby-line">
              Propulsé par <strong>TaapR</strong>
            </span>
            <span className="oc-poweredby-tag">
              La suite tout-en-un pour les restaurateurs
            </span>
          </a>
        </footer>
      </div>
    </div>
  );
}
