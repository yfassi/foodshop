import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/client";

export async function POST(request: Request) {
  try {
    const { restaurant_slug } = await request.json();

    // Authenticate
    const supabaseAuth = await createClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    // Fetch restaurant
    const supabase = createAdminClient();
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id, stripe_account_id, stripe_onboarding_complete")
      .eq("slug", restaurant_slug)
      .eq("owner_id", user.id)
      .single();

    if (!restaurant?.stripe_account_id || !restaurant.stripe_onboarding_complete) {
      return NextResponse.json(
        { error: "Compte Stripe non connecté" },
        { status: 400 }
      );
    }

    const stripeAccountId = restaurant.stripe_account_id;

    // Fetch balance for connected account
    const balance = await stripe.balance.retrieve({
      stripeAccount: stripeAccountId,
    });

    const availableBalance =
      balance.available.reduce((sum, b) => sum + b.amount, 0);
    const pendingBalance =
      balance.pending.reduce((sum, b) => sum + b.amount, 0);

    // Fetch recent payments (charges on the connected account)
    const charges = await stripe.charges.list(
      { limit: 20 },
      { stripeAccount: stripeAccountId }
    );

    const payments = charges.data.map((charge) => ({
      id: charge.id,
      amount: charge.amount,
      status: charge.status,
      created: charge.created,
      description: charge.description,
      paid: charge.paid,
    }));

    // Generate Stripe Express dashboard login link
    const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);

    return NextResponse.json({
      balance: {
        available: availableBalance,
        pending: pendingBalance,
        currency: balance.available[0]?.currency || "eur",
      },
      payments,
      dashboard_url: loginLink.url,
    });
  } catch (err) {
    console.error("Stripe dashboard data error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
