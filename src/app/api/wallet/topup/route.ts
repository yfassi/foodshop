import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripeLive, stripeTest } from "@/lib/stripe/client";
import { isDemoCustomerEmail, MISSING_TEST_KEYS_ERROR } from "@/lib/stripe/demo";
import type { WalletTopupTier } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { restaurant_public_id, amount, bonus } = (await request.json()) as {
      restaurant_public_id: string;
      amount: number; // in cents
      bonus?: number; // in cents
    };

    if (!restaurant_public_id || !amount || amount < 100) {
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

    const isDemo = await isDemoCustomerEmail(user.email);
    if (isDemo && !stripeTest) {
      return NextResponse.json({ error: MISSING_TEST_KEYS_ERROR }, { status: 500 });
    }
    const stripeClient = isDemo ? stripeTest! : stripeLive;

    const adminSupabase = createAdminClient();

    // Fetch restaurant
    const { data: restaurant } = await adminSupabase
      .from("restaurants")
      .select("id, stripe_account_id, stripe_onboarding_complete, wallet_topup_enabled, wallet_topup_tiers")
      .eq("public_id", restaurant_public_id)
      .single();

    if (!restaurant || (!isDemo && (!restaurant.stripe_account_id || !restaurant.stripe_onboarding_complete))) {
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
      if (!matchingTier || !restaurant.wallet_topup_enabled) {
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

    const session = await stripeClient.checkout.sessions.create({
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
      ...(isDemo
        ? {}
        : {
            payment_intent_data: {
              transfer_data: {
                destination: restaurant.stripe_account_id!,
              },
            },
          }),
      metadata: {
        type: "wallet_topup",
        user_id: user.id,
        restaurant_id: restaurant.id,
        amount: amount.toString(),
        ...(validatedBonus > 0 && { bonus: validatedBonus.toString() }),
        ...(isDemo && { is_demo: "true" }),
      },
      success_url: `${appUrl}/restaurant/${restaurant_public_id}/account?wallet_topup=success`,
      cancel_url: `${appUrl}/restaurant/${restaurant_public_id}/account?wallet_topup=cancelled`,
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
