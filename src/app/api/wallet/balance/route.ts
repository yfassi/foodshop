import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantSlug = searchParams.get("restaurant_slug");

    if (!restaurantSlug) {
      return NextResponse.json({ balance: 0 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ balance: 0 });
    }

    // Get restaurant ID
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id")
      .eq("slug", restaurantSlug)
      .single();

    if (!restaurant) {
      return NextResponse.json({ balance: 0 });
    }

    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .eq("restaurant_id", restaurant.id)
      .single();

    return NextResponse.json({ balance: wallet?.balance ?? 0 });
  } catch {
    return NextResponse.json({ balance: 0 });
  }
}
