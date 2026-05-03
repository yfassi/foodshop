import type { SubscriptionTier } from "./types";

const TIER_RANK: Record<SubscriptionTier, number> = {
  plat: 1,
  menu: 2,
  carte: 3,
};

const TIER_LABEL: Record<SubscriptionTier, string> = {
  plat: "Starter",
  menu: "Pro",
  carte: "Business",
};

export const EXTRA_RESTAURANT_PRICE = 39;

const TIER_PRICE: Record<SubscriptionTier, number> = {
  plat: 29,
  menu: 79,
  carte: 149,
};

const TIER_RESTAURANT_CAPACITY: Record<SubscriptionTier, number> = {
  plat: 1,
  menu: 1,
  carte: 5,
};

export function tierAtLeast(
  tier: SubscriptionTier | null | undefined,
  min: SubscriptionTier,
): boolean {
  if (!tier) return false;
  return TIER_RANK[tier] >= TIER_RANK[min];
}

export function getTierLabel(tier: SubscriptionTier): string {
  return TIER_LABEL[tier];
}

export function getTierPrice(tier: SubscriptionTier): number {
  return TIER_PRICE[tier];
}

export function getTierCapacity(tier: SubscriptionTier): number {
  return TIER_RESTAURANT_CAPACITY[tier];
}

export function nextTier(tier: SubscriptionTier): SubscriptionTier | null {
  if (tier === "plat") return "menu";
  if (tier === "menu") return "carte";
  return null;
}

export const TIER_ORDER: SubscriptionTier[] = ["plat", "menu", "carte"];

/* ─── Feature gates ─── */

export function canUseLoyalty(tier: SubscriptionTier): boolean {
  return tierAtLeast(tier, "menu");
}

export function canUseFloorPlan(tier: SubscriptionTier): boolean {
  return tierAtLeast(tier, "menu");
}

export function canUseExportCsv(tier: SubscriptionTier): boolean {
  return tierAtLeast(tier, "menu");
}

export function canUseSplitPayment(tier: SubscriptionTier): boolean {
  return tierAtLeast(tier, "menu");
}

export function canUseKitchenScreen(tier: SubscriptionTier): boolean {
  return tierAtLeast(tier, "menu");
}

export function canUseApi(tier: SubscriptionTier): boolean {
  return tierAtLeast(tier, "carte");
}

export function canManageMultipleRestaurants(tier: SubscriptionTier): boolean {
  return getTierCapacity(tier) > 1;
}
