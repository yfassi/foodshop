import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantPublicId = searchParams.get("restaurant_public_id");

    if (!restaurantPublicId) {
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
      .eq("public_id", restaurantPublicId)
      .single();

    if (!restaurant || restaurant.owner_id !== user.id) {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    // Wallets pour ce resto
    const { data: wallets } = await adminSupabase
      .from("wallets")
      .select("id, user_id, balance, updated_at")
      .eq("restaurant_id", restaurant.id)
      .order("updated_at", { ascending: false });

    if (!wallets || wallets.length === 0) {
      return NextResponse.json({ clients: [] });
    }

    const userIds = wallets.map((w) => w.user_id);
    const { data: profiles } = await adminSupabase
      .from("customer_profiles")
      .select("user_id, full_name, phone")
      .in("user_id", userIds);
    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

    // Bulk emails via listUsers paginé
    const userIdSet = new Set(userIds);
    const emailMap = new Map<string, string>();
    const PER_PAGE = 1000;
    for (let page = 1; page <= 50; page += 1) {
      const { data: usersPage, error: errUsers } =
        await adminSupabase.auth.admin.listUsers({ page, perPage: PER_PAGE });
      if (errUsers) break;
      for (const u of usersPage.users) {
        if (userIdSet.has(u.id) && u.email) emailMap.set(u.id, u.email);
      }
      if (usersPage.users.length < PER_PAGE) break;
      if (emailMap.size === userIdSet.size) break;
    }

    // Stats agrégées par client (orders pour ce resto, paid only pour la fidélité)
    const { data: orderRows } = await adminSupabase
      .from("orders")
      .select(
        "customer_user_id, total_price, created_at, status, paid, loyalty_points_used"
      )
      .eq("restaurant_id", restaurant.id)
      .in("customer_user_id", userIds)
      .neq("status", "cancelled");

    type Stats = {
      order_count: number;
      total_spent: number;
      last_order_at: string | null;
      points_earned: number;
      points_used: number;
    };
    const statsMap = new Map<string, Stats>();
    for (const row of orderRows || []) {
      if (!row.customer_user_id) continue;
      const cur = statsMap.get(row.customer_user_id) || {
        order_count: 0,
        total_spent: 0,
        last_order_at: null,
        points_earned: 0,
        points_used: 0,
      };
      cur.order_count += 1;
      cur.total_spent += row.total_price || 0;
      if (!cur.last_order_at || row.created_at > cur.last_order_at) {
        cur.last_order_at = row.created_at;
      }
      // Loyalty: paid orders only. Earning rule = 1€ → 1pt, except orders
      // that themselves redeem a discount (they earn 0).
      if (row.paid) {
        const used = row.loyalty_points_used ?? 0;
        cur.points_used += used;
        if (used === 0) {
          cur.points_earned += Math.floor((row.total_price ?? 0) / 100);
        }
      }
      statsMap.set(row.customer_user_id, cur);
    }

    const clients = wallets.map((w) => {
      const prof = profileMap.get(w.user_id);
      const stats = statsMap.get(w.user_id) || {
        order_count: 0,
        total_spent: 0,
        last_order_at: null,
        points_earned: 0,
        points_used: 0,
      };
      const pointsBalance = Math.max(0, stats.points_earned - stats.points_used);
      return {
        wallet_id: w.id,
        user_id: w.user_id,
        full_name: prof?.full_name || "Client",
        phone: prof?.phone || null,
        email: emailMap.get(w.user_id) || "",
        balance: w.balance,
        updated_at: w.updated_at,
        order_count: stats.order_count,
        total_spent: stats.total_spent,
        last_order_at: stats.last_order_at,
        points_earned: stats.points_earned,
        points_used: stats.points_used,
        points_balance: pointsBalance,
      };
    });

    return NextResponse.json({ clients });
  } catch (err) {
    console.error("Admin wallet list error:", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
