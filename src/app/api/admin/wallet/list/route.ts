import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantSlug = searchParams.get("restaurant_slug");

    if (!restaurantSlug) {
      return NextResponse.json(
        { error: "Slug manquant" },
        { status: 400 }
      );
    }

    // Verify admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // Verify restaurant ownership
    const { data: restaurant } = await adminSupabase
      .from("restaurants")
      .select("id, owner_id")
      .eq("slug", restaurantSlug)
      .single();

    if (!restaurant || restaurant.owner_id !== user.id) {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    // Fetch wallets for this restaurant
    const { data: wallets } = await adminSupabase
      .from("wallets")
      .select("id, user_id, balance, updated_at")
      .eq("restaurant_id", restaurant.id)
      .order("updated_at", { ascending: false });

    if (!wallets || wallets.length === 0) {
      return NextResponse.json({ clients: [] });
    }

    // Fetch customer profiles
    const userIds = wallets.map((w) => w.user_id);
    const { data: profiles } = await adminSupabase
      .from("customer_profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);

    const profileMap = new Map(
      (profiles || []).map((p) => [p.user_id, p.full_name])
    );

    // Get emails from auth
    const { data: usersData } = await adminSupabase.auth.admin.listUsers();
    const emailMap = new Map(
      (usersData?.users || []).map((u) => [u.id, u.email])
    );

    const clients = wallets.map((w) => ({
      wallet_id: w.id,
      user_id: w.user_id,
      full_name: profileMap.get(w.user_id) || "Client",
      email: emailMap.get(w.user_id) || "",
      balance: w.balance,
      updated_at: w.updated_at,
    }));

    return NextResponse.json({ clients });
  } catch (err) {
    console.error("Admin wallet list error:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
