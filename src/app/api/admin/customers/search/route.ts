import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface CustomerHit {
  user_id: string;
  wallet_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  balance: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantPublicId = searchParams.get("restaurant_public_id");
    const q = (searchParams.get("q") || "").trim().toLowerCase();

    if (!restaurantPublicId) {
      return NextResponse.json({ error: "Slug manquant" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    const { data: restaurant } = await adminSupabase
      .from("restaurants")
      .select("id, owner_id")
      .eq("public_id", restaurantPublicId)
      .single();

    if (!restaurant || restaurant.owner_id !== user.id) {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    const { data: orderRows } = await adminSupabase
      .from("orders")
      .select("customer_user_id")
      .eq("restaurant_id", restaurant.id)
      .not("customer_user_id", "is", null);

    const userIds = Array.from(
      new Set(
        (orderRows || [])
          .map((r) => r.customer_user_id as string | null)
          .filter((v): v is string => !!v)
      )
    );

    if (userIds.length === 0) {
      return NextResponse.json({ customers: [] });
    }

    const [{ data: profiles }, { data: wallets }] = await Promise.all([
      adminSupabase
        .from("customer_profiles")
        .select("user_id, full_name, phone")
        .in("user_id", userIds),
      adminSupabase
        .from("wallets")
        .select("id, user_id, balance")
        .eq("restaurant_id", restaurant.id)
        .in("user_id", userIds),
    ]);

    const profileMap = new Map(
      (profiles || []).map((p) => [
        p.user_id,
        { full_name: p.full_name, phone: p.phone as string | null },
      ])
    );
    const walletMap = new Map(
      (wallets || []).map((w) => [w.user_id, { id: w.id, balance: w.balance }])
    );

    const emailMap = new Map<string, string>();
    await Promise.all(
      userIds.map(async (userId) => {
        const { data } = await adminSupabase.auth.admin.getUserById(userId);
        if (data?.user?.email) emailMap.set(userId, data.user.email);
      })
    );

    let customers: CustomerHit[] = userIds.map((userId) => {
      const prof = profileMap.get(userId);
      const wallet = walletMap.get(userId);
      return {
        user_id: userId,
        wallet_id: wallet?.id || null,
        full_name: prof?.full_name || "Client",
        email: emailMap.get(userId) || "",
        phone: prof?.phone || null,
        balance: wallet?.balance || 0,
      };
    });

    if (q) {
      customers = customers.filter((c) => {
        return (
          c.full_name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.phone || "").toLowerCase().includes(q)
        );
      });
    }

    customers.sort((a, b) => a.full_name.localeCompare(b.full_name));

    return NextResponse.json({ customers: customers.slice(0, 30) });
  } catch (err) {
    console.error("Admin customers search error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
