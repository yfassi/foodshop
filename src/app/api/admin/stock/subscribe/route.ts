import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyStockAccess } from "@/lib/stock/auth";

export async function POST(request: Request) {
  try {
    const { restaurant_id } = (await request.json()) as { restaurant_id: string };
    if (!restaurant_id) {
      return NextResponse.json({ error: "restaurant_id manquant" }, { status: 400 });
    }

    // Owner check, but module need not be active yet (we're trying to activate).
    const access = await verifyStockAccess(restaurant_id, { requireActive: false });
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const priceId = process.env.STRIPE_PRICE_STOCK_MODULE;
    if (!priceId) {
      return NextResponse.json(
        { error: "Configuration Stripe manquante (STRIPE_PRICE_STOCK_MODULE)" },
        { status: 500 }
      );
    }

    const supabase = createAdminClient();
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id, slug, name, stock_module_active, stock_stripe_subscription_id")
      .eq("id", restaurant_id)
      .single();
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant introuvable" }, { status: 404 });
    }
    if (restaurant.stock_module_active && restaurant.stock_stripe_subscription_id) {
      return NextResponse.json({ error: "Module déjà actif" }, { status: 409 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Customer email for prefilling (best-effort — fall back if no email)
    let customerEmail: string | undefined;
    {
      const sb = createAdminClient();
      const { data: userInfo } = await sb.auth.admin.getUserById(access.userId);
      customerEmail = userInfo?.user?.email || undefined;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      locale: "fr",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: {
          type: "stock_subscription",
          restaurant_id,
        },
        trial_period_days: 14,
      },
      customer_email: customerEmail,
      success_url: `${appUrl}/admin/${restaurant.slug}/stock?activated=1`,
      cancel_url: `${appUrl}/admin/${restaurant.slug}/stock/activation?cancelled=1`,
      metadata: {
        type: "stock_subscription",
        restaurant_id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stock subscribe error:", err);
    return NextResponse.json({ error: "Erreur Stripe" }, { status: 500 });
  }
}
