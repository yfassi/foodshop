import { NextResponse } from "next/server";
import { stripeLive, stripeTest } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushNotification } from "@/lib/push";
import { sendOrderConfirmationEmail } from "@/lib/email/send-order-confirmation";
import { formatPrice } from "@/lib/format";
import Stripe from "stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  // Try the LIVE secret first; if it fails, fall back to TEST. Demo orders
  // are paid with Stripe test keys so their webhooks are signed with the
  // test secret. Both endpoints (live + test) point to this URL.
  const liveSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const testSecret = process.env.STRIPE_TEST_WEBHOOK_SECRET;

  let event: Stripe.Event | null = null;
  const errors: string[] = [];

  if (liveSecret) {
    try {
      event = stripeLive.webhooks.constructEvent(body, signature, liveSecret);
    } catch (err) {
      errors.push(`live: ${(err as Error).message}`);
    }
  }

  if (!event && testSecret && stripeTest) {
    try {
      event = stripeTest.webhooks.constructEvent(body, signature, testSecret);
    } catch (err) {
      errors.push(`test: ${(err as Error).message}`);
    }
  }

  if (!event) {
    console.error("Webhook signature verification failed:", errors.join(" | "));
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const sessionType = session.metadata?.type;

    if (sessionType === "wallet_topup") {
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

        // Send customer confirmation email (idempotent — safe on webhook retry)
        void sendOrderConfirmationEmail({ orderId });

        // Send push notification to admin
        if (order) {
          const { data: restaurant } = await supabase
            .from("restaurants")
            .select("public_id")
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
                    url: `/admin/${restaurant.public_id}`,
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

  return NextResponse.json({ received: true });
}
