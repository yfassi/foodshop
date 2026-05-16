import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LoyaltyTier } from "@/lib/types";

// Loyalty aggregate stats for a restaurant. Returns earned/used/outstanding
// points across the customer base + the last redemptions with customer context.

const RECENT_LIMIT = 20;
const TOP_REDEEMERS_LIMIT = 5;

type OrderRow = {
  customer_user_id: string | null;
  total_price: number;
  status: string;
  paid: boolean;
  loyalty_tier_id: string | null;
  loyalty_discount_amount: number | null;
  loyalty_points_used: number | null;
  display_order_number: string | null;
  order_number: number;
  customer_info: { name?: string } | null;
  created_at: string;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantPublicId = searchParams.get("restaurant_public_id");
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
      .select("id, owner_id, loyalty_enabled, loyalty_tiers")
      .eq("public_id", restaurantPublicId)
      .single();
    if (!restaurant || restaurant.owner_id !== user.id) {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    const { data: orderRows } = await adminSupabase
      .from("orders")
      .select(
        "customer_user_id, total_price, status, paid, loyalty_tier_id, loyalty_discount_amount, loyalty_points_used, display_order_number, order_number, customer_info, created_at"
      )
      .eq("restaurant_id", restaurant.id)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(1000)
      .returns<OrderRow[]>();

    const rows = orderRows ?? [];
    const paid = rows.filter((r) => r.paid);

    // Aggregate earn/use by customer (rule: 1€ = 1pt, except orders that redeem).
    const perCustomer = new Map<
      string,
      { earned: number; used: number; redemptions: number; spend: number }
    >();
    let totalEarned = 0;
    let totalUsed = 0;
    let totalDiscount = 0;
    let totalRedemptions = 0;

    for (const r of paid) {
      const uid = r.customer_user_id;
      const used = r.loyalty_points_used ?? 0;
      const discount = r.loyalty_discount_amount ?? 0;
      const earned = used > 0 ? 0 : Math.floor((r.total_price ?? 0) / 100);
      totalEarned += earned;
      totalUsed += used;
      totalDiscount += discount;
      if (used > 0) totalRedemptions += 1;
      if (!uid) continue;
      const cur = perCustomer.get(uid) ?? {
        earned: 0,
        used: 0,
        redemptions: 0,
        spend: 0,
      };
      cur.earned += earned;
      cur.used += used;
      cur.spend += r.total_price ?? 0;
      if (used > 0) cur.redemptions += 1;
      perCustomer.set(uid, cur);
    }

    // Recent redemptions (orders with loyalty_points_used > 0)
    const recentRows = paid
      .filter((r) => (r.loyalty_points_used ?? 0) > 0)
      .slice(0, RECENT_LIMIT);

    const tiers = (restaurant.loyalty_tiers as LoyaltyTier[] | null) ?? [];
    const tierMap = new Map(tiers.map((t) => [t.id, t]));

    const recentRedemptions = recentRows.map((r) => {
      const tier = r.loyalty_tier_id ? tierMap.get(r.loyalty_tier_id) : null;
      return {
        order_id_display:
          r.display_order_number || `#${r.order_number}`,
        customer_user_id: r.customer_user_id,
        customer_name: r.customer_info?.name ?? null,
        points_used: r.loyalty_points_used ?? 0,
        discount_amount: r.loyalty_discount_amount ?? 0,
        tier_label:
          tier?.label ||
          (tier?.reward_type === "discount"
            ? `-${tier.discount_amount}€`
            : tier?.product_name ?? "Récompense"),
        created_at: r.created_at,
      };
    });

    // Top redeemers (by points_used) — need names. Fetch profiles for the
    // set of users in perCustomer.
    const userIds = Array.from(perCustomer.keys()).filter(Boolean);
    const profileById = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles } = await adminSupabase
        .from("customer_profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      for (const p of profiles ?? []) {
        if (p.full_name) profileById.set(p.user_id, p.full_name);
      }
    }

    const topRedeemers = Array.from(perCustomer.entries())
      .filter(([, v]) => v.used > 0)
      .sort((a, b) => b[1].used - a[1].used)
      .slice(0, TOP_REDEEMERS_LIMIT)
      .map(([userId, v]) => ({
        user_id: userId,
        name: profileById.get(userId) ?? "Client",
        points_earned: v.earned,
        points_used: v.used,
        points_balance: Math.max(0, v.earned - v.used),
        redemptions: v.redemptions,
        total_spent: v.spend,
      }));

    const activeMembers = Array.from(perCustomer.values()).filter(
      (v) => v.earned > 0 || v.used > 0
    ).length;

    return NextResponse.json({
      enabled: restaurant.loyalty_enabled ?? false,
      totals: {
        active_members: activeMembers,
        points_earned: totalEarned,
        points_used: totalUsed,
        points_outstanding: Math.max(0, totalEarned - totalUsed),
        redemptions: totalRedemptions,
        discount_amount: totalDiscount,
      },
      recent_redemptions: recentRedemptions,
      top_redeemers: topRedeemers,
    });
  } catch (err) {
    console.error("[loyalty/stats] error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
