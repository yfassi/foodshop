import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/client";

interface ConnectBody {
  restaurant_slug: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ConnectBody;
    const { restaurant_slug } = body;

    // Authenticate the owner
    const supabaseAuth = await createClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    // Fetch restaurant and verify ownership
    const supabase = createAdminClient();
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id, slug, name, stripe_account_id")
      .eq("slug", restaurant_slug)
      .eq("owner_id", user.id)
      .single();

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant introuvable" },
        { status: 404 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    let stripeAccountId = restaurant.stripe_account_id;

    // Create Stripe Express account if it does not exist yet
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "FR",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          restaurant_id: restaurant.id,
          restaurant_slug: restaurant.slug,
        },
      });

      stripeAccountId = account.id;

      await supabase
        .from("restaurants")
        .update({ stripe_account_id: stripeAccountId })
        .eq("id", restaurant.id);
    }

    // Generate onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${appUrl}/admin/${restaurant_slug}/settings?stripe_refresh=true`,
      return_url: `${appUrl}/admin/${restaurant_slug}/settings?stripe_return=true`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err) {
    console.error("Stripe Connect error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
