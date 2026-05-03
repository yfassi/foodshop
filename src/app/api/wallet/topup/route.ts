import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";
import type { WalletTopupTier } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { restaurant_slug, amount, bonus } = (await request.json()) as {
      restaurant_slug: string;
      amount: number; // in cents
      bonus?: number; // in cents
    };

    if (!restaurant_slug || !amount || amount < 100) {
      return NextResponse.json(
        { error: "Montant minimum : 1,00 EUR" },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Vous devez etre connecte" },
        { status: 401 }
      );
    }

    const adminSupabase = createAdminClient();

    // Fetch restaurant
    const { data: restaurant } = await adminSupabase
      .from("restaurants")
      .select("id, stripe_account_id, stripe_onboarding_complete, wallet_topup_enabled, wallet_topup_tiers")
      .eq("slug", restaurant_slug)
      .single();

    if (
      !restaurant ||
      !restaurant.stripe_account_id ||
      !restaurant.stripe_onboarding_complete ||
      !restaurant.wallet_topup_enabled
    ) {
      return NextResponse.json(
        { error: "La recharge en ligne n'est pas disponible" },
        { status: 400 }
      );
    }

    // Validate bonus against configured tiers
    let validatedBonus = 0;
    if (bonus && bonus > 0) {
      const tiers = (restaurant.wallet_topup_tiers as WalletTopupTier[]) || [];
      const matchingTier = tiers.find(
        (t) => t.amount === amount && t.bonus === bonus
      );
      if (!matchingTier) {
        return NextResponse.json(
          { error: "Palier de recharge invalide" },
          { status: 400 }
        );
      }
      validatedBonus = bonus;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const productName = validatedBonus > 0
      ? `Recharge ${(amount / 100).toFixed(2)} € + ${(validatedBonus / 100).toFixed(2)} € offerts`
      : "Recharge de solde";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      locale: "fr",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: productName },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        transfer_data: {
          destination: restaurant.stripe_account_id,
        },
      },
      metadata: {
        type: "wallet_topup",
        user_id: user.id,
        restaurant_id: restaurant.id,
        amount: amount.toString(),
        ...(validatedBonus > 0 && { bonus: validatedBonus.toString() }),
      },
      success_url: `${appUrl}/${restaurant_slug}/account?wallet_topup=success`,
      cancel_url: `${appUrl}/${restaurant_slug}/account?wallet_topup=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Wallet topup error:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
