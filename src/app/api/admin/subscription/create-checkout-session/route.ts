import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  getTierPriceId,
  getDeliveryAddonPriceId,
  getStockAddonPriceId,
  TRIAL_DAYS,
  type BillingInterval,
} from "@/lib/subscription";
import type { SubscriptionTier } from "@/lib/types";

interface CheckoutBody {
  restaurant_slug: string;
  tier: SubscriptionTier;
  interval?: BillingInterval;
  addons?: Array<"delivery" | "stock">;
  with_trial?: boolean;
}

const VALID_TIERS: SubscriptionTier[] = ["plat", "menu", "carte"];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckoutBody;
    const {
      restaurant_slug,
      tier,
      interval = "monthly",
      addons = [],
      with_trial = true,
    } = body;

    if (!restaurant_slug || !tier || !VALID_TIERS.includes(tier)) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const serverSupabase = await createClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select(
        "id, owner_id, name, stripe_customer_id, stripe_subscription_id, stripe_subscription_status"
      )
      .eq("slug", restaurant_slug)
      .single();

    if (!restaurant || restaurant.owner_id !== user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    if (
      restaurant.stripe_subscription_id &&
      (restaurant.stripe_subscription_status === "active" ||
        restaurant.stripe_subscription_status === "trialing")
    ) {
      return NextResponse.json(
        {
          error:
            "Un abonnement est déjà actif. Utilisez le portail pour modifier votre plan.",
        },
        { status: 409 }
      );
    }

    const tierPriceId = getTierPriceId(tier, interval);
    if (!tierPriceId) {
      return NextResponse.json(
        { error: `Price ID manquant pour ${tier} (${interval})` },
        { status: 500 }
      );
    }

    const lineItems: Array<{ price: string; quantity: number }> = [
      { price: tierPriceId, quantity: 1 },
    ];

    if (addons.includes("delivery")) {
      const deliveryPrice = getDeliveryAddonPriceId();
      if (!deliveryPrice) {
        return NextResponse.json(
          { error: "Price ID livraison manquant" },
          { status: 500 }
        );
      }
      lineItems.push({ price: deliveryPrice, quantity: 1 });
    }

    if (addons.includes("stock")) {
      const stockPrice = getStockAddonPriceId();
      if (!stockPrice) {
        return NextResponse.json(
          { error: "Price ID stock manquant" },
          { status: 500 }
        );
      }
      lineItems.push({ price: stockPrice, quantity: 1 });
    }

    let customerId = restaurant.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: restaurant.name,
        metadata: {
          restaurant_id: restaurant.id,
          owner_user_id: user.id,
        },
      });
      customerId = customer.id;
      await supabase
        .from("restaurants")
        .update({ stripe_customer_id: customerId })
        .eq("id", restaurant.id);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      locale: "fr",
      customer: customerId,
      line_items: lineItems,
      subscription_data: {
        ...(with_trial && { trial_period_days: TRIAL_DAYS }),
        metadata: {
          restaurant_id: restaurant.id,
          owner_user_id: user.id,
        },
      },
      metadata: {
        type: "platform_subscription",
        restaurant_id: restaurant.id,
        tier,
        interval,
        addons: addons.join(",") || "none",
      },
      allow_promotion_codes: true,
      success_url: `${appUrl}/admin/${restaurant_slug}/settings?tab=account&subscription=success`,
      cancel_url: `${appUrl}/admin/${restaurant_slug}/settings?tab=account&subscription=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Subscription checkout error:", err);
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
