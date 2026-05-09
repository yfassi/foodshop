import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/super-admin";
import { getTierPrice, normalizeTier } from "@/lib/subscription";
import type { SubscriptionTier } from "@/lib/types";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: "Non autorise" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: restaurants, error } = await admin
    .from("restaurants")
    .select(
      "id, name, slug, owner_id, is_active, subscription_tier, delivery_addon_active, stock_module_active, created_at, verification_status, stripe_onboarding_complete"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = restaurants || [];

  const ownerIds = Array.from(
    new Set(list.map((r) => r.owner_id).filter(Boolean))
  ) as string[];

  const ownerEmailById: Record<string, string | null> = {};
  await Promise.all(
    ownerIds.map(async (ownerId) => {
      const { data } = await admin.auth.admin.getUserById(ownerId);
      ownerEmailById[ownerId] = data?.user?.email ?? null;
    })
  );

  // Per-tier MRR aggregation (active restaurants only).
  // Normalize legacy tier values (essentiel/pro/business) to the current model.
  let totalMrr = 0;
  const tierCounts: Record<SubscriptionTier, number> = {
    plat: 0,
    menu: 0,
    carte: 0,
  };
  const enriched = list.map((r) => {
    const tier = normalizeTier(r.subscription_tier);
    if (r.is_active) {
      tierCounts[tier] += 1;
      totalMrr += getTierPrice(tier);
    }
    return {
      ...r,
      subscription_tier: tier,
      owner_email: r.owner_id ? ownerEmailById[r.owner_id] : null,
    };
  });

  return NextResponse.json({
    restaurants: enriched,
    summary: {
      total_mrr: totalMrr,
      tier_counts: tierCounts,
      total_active: list.filter((r) => r.is_active).length,
      total_restaurants: list.length,
    },
  });
}
