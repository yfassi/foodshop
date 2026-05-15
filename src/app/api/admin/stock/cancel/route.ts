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
    const access = await verifyStockAccess(restaurant_id, { requireActive: false });
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const supabase = createAdminClient();
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id, stock_stripe_subscription_id")
      .eq("id", restaurant_id)
      .single();
    if (!restaurant?.stock_stripe_subscription_id) {
      return NextResponse.json({ error: "Aucun abonnement actif" }, { status: 404 });
    }

    await stripe.subscriptions.cancel(restaurant.stock_stripe_subscription_id);

    // Optimistic update — webhook will confirm.
    await supabase
      .from("restaurants")
      .update({
        stock_module_active: false,
        stock_enabled: false,
        stock_subscription_status: "canceled",
      })
      .eq("id", restaurant_id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Stock cancel error:", err);
    return NextResponse.json({ error: "Erreur Stripe" }, { status: 500 });
  }
}
