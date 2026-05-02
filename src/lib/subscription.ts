import type { SubscriptionTier, StripeSubscriptionStatus } from "./types";

const TIER_RANK: Record<SubscriptionTier, number> = {
  plat: 1,
  menu: 2,
  carte: 3,
};

const TIER_LABEL: Record<SubscriptionTier, string> = {
  plat: "Le Plat",
  menu: "Le Menu",
  carte: "Carte Blanche",
};

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

/* ─── Stripe Billing ─── */

export const TRIAL_DAYS = 14;

export const DELIVERY_ADDON_PRICE_EUR = 19;
export const STOCK_ADDON_PRICE_EUR = 12;

export type BillingInterval = "monthly" | "annual";

interface PriceMap {
  plat: { monthly?: string; annual?: string };
  menu: { monthly?: string; annual?: string };
  carte: { monthly?: string; annual?: string };
  delivery: { monthly?: string };
  stock: { monthly?: string };
}

export const STRIPE_PRICE_IDS: PriceMap = {
  plat: {
    monthly: process.env.STRIPE_PRICE_PLAT_MONTHLY,
    annual: process.env.STRIPE_PRICE_PLAT_ANNUAL,
  },
  menu: {
    monthly: process.env.STRIPE_PRICE_MENU_MONTHLY,
    annual: process.env.STRIPE_PRICE_MENU_ANNUAL,
  },
  carte: {
    monthly: process.env.STRIPE_PRICE_CARTE_MONTHLY,
    annual: process.env.STRIPE_PRICE_CARTE_ANNUAL,
  },
  delivery: { monthly: process.env.STRIPE_PRICE_DELIVERY_MONTHLY },
  stock: { monthly: process.env.STRIPE_PRICE_STOCK_MONTHLY },
};

export function getTierPriceId(
  tier: SubscriptionTier,
  interval: BillingInterval = "monthly",
): string | undefined {
  return STRIPE_PRICE_IDS[tier][interval];
}

export function getDeliveryAddonPriceId(): string | undefined {
  return STRIPE_PRICE_IDS.delivery.monthly;
}

export function getStockAddonPriceId(): string | undefined {
  return STRIPE_PRICE_IDS.stock.monthly;
}

export type PriceResolution =
  | { kind: "tier"; tier: SubscriptionTier; interval: BillingInterval }
  | { kind: "addon"; addon: "delivery" | "stock" };

export function resolvePriceId(priceId: string): PriceResolution | null {
  for (const tier of TIER_ORDER) {
    const intervals: BillingInterval[] = ["monthly", "annual"];
    for (const interval of intervals) {
      if (STRIPE_PRICE_IDS[tier][interval] === priceId) {
        return { kind: "tier", tier, interval };
      }
    }
  }
  if (STRIPE_PRICE_IDS.delivery.monthly === priceId) {
    return { kind: "addon", addon: "delivery" };
  }
  if (STRIPE_PRICE_IDS.stock.monthly === priceId) {
    return { kind: "addon", addon: "stock" };
  }
  return null;
}

export function isSubscriptionUsable(
  status: StripeSubscriptionStatus | null | undefined,
): boolean {
  if (!status) return false;
  return status === "active" || status === "trialing";
}

export function isSubscriptionPastDue(
  status: StripeSubscriptionStatus | null | undefined,
): boolean {
  return status === "past_due" || status === "unpaid";
}
