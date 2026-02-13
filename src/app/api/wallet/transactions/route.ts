import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantSlug = searchParams.get("restaurant_slug");

    if (!restaurantSlug) {
      return NextResponse.json(
        { error: "restaurant_slug requis" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Get restaurant
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id")
      .eq("slug", restaurantSlug)
      .single();

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant introuvable" },
        { status: 404 }
      );
    }

    // Get wallet
    const { data: wallet } = await supabase
      .from("wallets")
      .select("id")
      .eq("user_id", user.id)
      .eq("restaurant_id", restaurant.id)
      .single();

    if (!wallet) {
      return NextResponse.json({ transactions: [] });
    }

    // Get transactions
    const { data: transactions, error } = await supabase
      .from("wallet_transactions")
      .select("id, type, amount, balance_after, description, order_id, created_at")
      .eq("wallet_id", wallet.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json(
        { error: "Erreur lors de la récupération" },
        { status: 500 }
      );
    }

    return NextResponse.json({ transactions: transactions ?? [] });
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
