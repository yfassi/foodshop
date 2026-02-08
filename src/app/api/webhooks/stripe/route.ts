import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
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

    if (sessionType === "wallet_topup") {
      // Handle wallet top-up
      const userId = session.metadata?.user_id;
      const restaurantId = session.metadata?.restaurant_id;
      const amount = parseInt(session.metadata?.amount || "0", 10);

      if (userId && restaurantId && amount > 0) {
        // Get or create wallet
        const { data: existingWallet } = await supabase
          .from("wallets")
          .select("id, balance")
          .eq("user_id", userId)
          .eq("restaurant_id", restaurantId)
          .single();

        let walletId: string;
        let newBalance: number;

        if (existingWallet) {
          walletId = existingWallet.id;
          newBalance = existingWallet.balance + amount;
          await supabase
            .from("wallets")
            .update({ balance: newBalance })
            .eq("id", walletId);
        } else {
          newBalance = amount;
          const { data: newWallet } = await supabase
            .from("wallets")
            .insert({
              user_id: userId,
              restaurant_id: restaurantId,
              balance: amount,
            })
            .select("id")
            .single();

          walletId = newWallet?.id || "";
        }

        if (walletId) {
          await supabase.from("wallet_transactions").insert({
            wallet_id: walletId,
            type: "topup_stripe",
            amount,
            balance_after: newBalance,
            stripe_session_id: session.id,
          });
        }
      }
    } else {
      // Handle order payment
      const orderId = session.metadata?.order_id;
      if (orderId) {
        await supabase
          .from("orders")
          .update({
            paid: true,
            stripe_payment_intent_id: session.payment_intent as string,
          })
          .eq("id", orderId);
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
