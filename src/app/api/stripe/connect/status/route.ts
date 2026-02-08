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
      .select("id, stripe_account_id")
      .eq("slug", restaurant_slug)
      .eq("owner_id", user.id)
      .single();

    if (!restaurant?.stripe_account_id) {
      return NextResponse.json({ onboarding_complete: false });
    }

    // Retrieve account from Stripe to check status
    const account = await stripe.accounts.retrieve(
      restaurant.stripe_account_id
    );
    const isComplete =
      account.charges_enabled === true && account.details_submitted === true;

    // Update database if onboarding just completed
    if (isComplete) {
      await supabase
        .from("restaurants")
        .update({ stripe_onboarding_complete: true })
        .eq("id", restaurant.id);
    }

    return NextResponse.json({
      onboarding_complete: isComplete,
      charges_enabled: account.charges_enabled,
      details_submitted: account.details_submitted,
    });
  } catch (err) {
    console.error("Stripe status check error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
