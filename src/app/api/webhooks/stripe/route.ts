import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushNotification } from "@/lib/push";
import { formatPrice } from "@/lib/format";
import { resolvePriceId } from "@/lib/subscription";
import type { SubscriptionTier } from "@/lib/types";
import Stripe from "stripe";

type SubscriptionState = {
  tier?: SubscriptionTier;
  delivery_addon_active: boolean;
  stock_module_active: boolean;
};

function deriveSubscriptionState(
  subscription: Stripe.Subscription
): SubscriptionState {
  const state: SubscriptionState = {
    delivery_addon_active: false,
    stock_module_active: false,
  };

  for (const item of subscription.items.data) {
    const resolved = resolvePriceId(item.price.id);
    if (!resolved) continue;
    if (resolved.kind === "tier") {
      state.tier = resolved.tier;
    } else if (resolved.kind === "addon") {
      if (resolved.addon === "delivery") state.delivery_addon_active = true;
      if (resolved.addon === "stock") state.stock_module_active = true;
    }
  }

  return state;
}

async function syncRestaurantFromSubscription(
  supabase: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription
): Promise<void> {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!restaurant) {
    console.warn(
      `[stripe webhook] no restaurant found for customer ${customerId}`
    );
    return;
  }

  const state = deriveSubscriptionState(subscription);

  const subWithPeriod = subscription as unknown as {
    current_period_end?: number;
    items: { data: Array<{ current_period_end?: number }> };
  };
  const periodEnd =
    subWithPeriod.current_period_end ??
    subWithPeriod.items.data[0]?.current_period_end ??
    null;

  const update: Record<string, unknown> = {
    stripe_subscription_id: subscription.id,
    stripe_subscription_status: subscription.status,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    trial_ends_at: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null,
    delivery_addon_active: state.delivery_addon_active,
    stock_module_active: state.stock_module_active,
  };

  if (state.tier) {
    update.subscription_tier = state.tier;
  }

  if (
    subscription.status === "canceled" ||
    subscription.status === "incomplete_expired"
  ) {
    update.stripe_subscription_id = null;
    update.delivery_addon_active = false;
    update.stock_module_active = false;
  }

  await supabase.from("restaurants").update(update).eq("id", restaurant.id);
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const sessionType = session.metadata?.type;

    if (sessionType === "platform_subscription" || session.mode === "subscription") {
      const restaurantId = session.metadata?.restaurant_id;
      const customerId =
        typeof session.customer === "string" ? session.customer : session.customer?.id;

      if (restaurantId && customerId) {
        await supabase
          .from("restaurants")
          .update({ stripe_customer_id: customerId })
          .eq("id", restaurantId);
      }
    } else if (sessionType === "wallet_topup") {
      // Handle wallet top-up
      const userId = session.metadata?.user_id;
      const restaurantId = session.metadata?.restaurant_id;
      const amount = parseInt(session.metadata?.amount || "0", 10);
      const bonus = parseInt(session.metadata?.bonus || "0", 10);
      const totalCredit = amount + bonus;

      if (userId && restaurantId && amount > 0) {
        // Idempotency check: verify this session hasn't already been processed
        const { data: existingTx } = await supabase
          .from("wallet_transactions")
          .select("id")
          .eq("stripe_session_id", session.id)
          .single();

        if (existingTx) {
          // Already processed, return success
          return NextResponse.json({ received: true });
        }

        // Get or create wallet
        const { data: existingWallet } = await supabase
          .from("wallets")
          .select("id, balance")
          .eq("user_id", userId)
          .eq("restaurant_id", restaurantId)
          .single();

        let walletId: string;

        if (existingWallet) {
          walletId = existingWallet.id;
        } else {
          const { data: newWallet } = await supabase
            .from("wallets")
            .insert({
              user_id: userId,
              restaurant_id: restaurantId,
              balance: 0,
            })
            .select("id")
            .single();

          walletId = newWallet?.id || "";
        }

        if (walletId) {
          const description = bonus > 0
            ? `Recharge ${(amount / 100).toFixed(2)} € + ${(bonus / 100).toFixed(2)} € offerts`
            : undefined;

          // Use atomic credit function (amount + bonus)
          await supabase.rpc("credit_wallet_balance", {
            p_wallet_id: walletId,
            p_amount: totalCredit,
            p_type: "topup_stripe",
            p_stripe_session_id: session.id,
            ...(description && { p_description: description }),
          });
        }
      }
    } else {
      // Handle order payment
      const orderId = session.metadata?.order_id;
      if (orderId) {
        const { data: order } = await supabase
          .from("orders")
          .select("id, display_order_number, order_number, total_price, restaurant_id")
          .eq("id", orderId)
          .single();

        await supabase
          .from("orders")
          .update({
            paid: true,
            stripe_payment_intent_id: session.payment_intent as string,
          })
          .eq("id", orderId);

        // Send push notification to admin
        if (order) {
          const { data: restaurant } = await supabase
            .from("restaurants")
            .select("slug")
            .eq("id", order.restaurant_id)
            .single();

          const { data: subs } = await supabase
            .from("push_subscriptions")
            .select("id, endpoint, p256dh, auth")
            .eq("restaurant_id", order.restaurant_id)
            .eq("role", "admin");

          if (subs?.length && restaurant) {
            const orderNum = order.display_order_number || `#${order.order_number}`;
            const expiredIds: string[] = [];
            await Promise.all(
              subs.map(async (sub) => {
                const result = await sendPushNotification(
                  { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
                  {
                    title: "Nouvelle commande",
                    body: `Commande ${orderNum} — ${formatPrice(order.total_price)}`,
                    url: `/admin/${restaurant.slug}`,
                    tag: "new-order",
                  }
                );
                if (result.expired) expiredIds.push(sub.id);
              })
            );
            if (expiredIds.length > 0) {
              await supabase.from("push_subscriptions").delete().in("id", expiredIds);
            }
          }
        }

        // Complete queue ticket if applicable
        const queueSessionId = session.metadata?.queue_session_id;
        const restaurantId = session.metadata?.restaurant_id;
        if (queueSessionId && restaurantId) {
          await supabase
            .from("queue_tickets")
            .update({ status: "completed", updated_at: new Date().toISOString() })
            .eq("restaurant_id", restaurantId)
            .eq("customer_session_id", queueSessionId)
            .eq("status", "active");
        }
      }
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id;

    if (orderId) {
      await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId);
    }
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    await syncRestaurantFromSubscription(supabase, subscription);
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
    const subscriptionId = invoice.subscription;
    if (subscriptionId && typeof subscriptionId === "string") {
      await supabase
        .from("restaurants")
        .update({ stripe_subscription_status: "past_due" })
        .eq("stripe_subscription_id", subscriptionId);
    }
  }

  return NextResponse.json({ received: true });
}
