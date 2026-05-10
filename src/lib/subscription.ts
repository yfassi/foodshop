import type { SubscriptionTier } from "./types";
import {
  PLANS,
  PLAN_ORDER,
  type PlanId,
  type FeatureKey,
} from "./plans";

/**
 * Tier-level helpers that wrap `lib/plans.ts` as the source of truth.
 *
 * `SubscriptionTier` and `PlanId` are the same union (`essentiel | pro | groupe`).
 * This module exists for legacy import compatibility and to expose feature
 * predicates (`canUseLoyalty`, `canUseFloorPlan`, …) used by API routes and
 * server-side gating.
 */

// Maps any value the DB might still hold to a current tier.
// Migration 025 normalises existing rows, but we still defend at read-time
// so a stray value (manual SQL, restored backup) never crashes the UI.
const LEGACY_TIER_MAP: Record<string, SubscriptionTier> = {
  plat: "essentiel",
  menu: "pro",
  carte: "groupe",
  business: "groupe",
};

export function normalizeTier(value: string | null | undefined): SubscriptionTier {
  if (!value) return "essentiel";
  if (value === "essentiel" || value === "pro" || value === "groupe") return value;
  return LEGACY_TIER_MAP[value] ?? "essentiel";
}

const TIER_RANK: Record<SubscriptionTier, number> = {
  essentiel: 1,
  pro: 2,
  groupe: 3,
};

export function tierAtLeast(
  tier: SubscriptionTier | null | undefined,
  min: SubscriptionTier,
): boolean {
  if (!tier) return false;
  return TIER_RANK[tier] >= TIER_RANK[min];
}

export function getTierLabel(tier: SubscriptionTier): string {
  return PLANS[tier].name;
}

export function getTierPrice(tier: SubscriptionTier): number {
  return PLANS[tier].monthlyPrice;
}

export function getTierCapacity(tier: SubscriptionTier): number {
  return PLANS[tier].includedRestaurants;
}

export function nextTier(tier: SubscriptionTier): SubscriptionTier | null {
  const idx = PLAN_ORDER.indexOf(tier);
  if (idx < 0 || idx >= PLAN_ORDER.length - 1) return null;
  return PLAN_ORDER[idx + 1];
}

export const TIER_ORDER: SubscriptionTier[] = PLAN_ORDER;

export const EXTRA_RESTAURANT_PRICE = PLANS.pro.extraRestaurantPrice ?? 39;

/* ─── Feature gates ─── */
// These mirror PLANS[tier].features but keep a stable function-based API
// for server-side callers that don't want to import the full plans config.

function hasFeature(tier: SubscriptionTier, feature: FeatureKey): boolean {
  return PLANS[tier].features[feature];
}

export function canUseLoyalty(tier: SubscriptionTier): boolean {
  return hasFeature(tier, "loyalty");
}

export function canUseFloorPlan(tier: SubscriptionTier): boolean {
  return hasFeature(tier, "floorPlan");
}

export function canUseExportCsv(tier: SubscriptionTier): boolean {
  return hasFeature(tier, "csvExport");
}

export function canUseKitchenScreen(tier: SubscriptionTier): boolean {
  return hasFeature(tier, "kitchenScreen");
}

export function canUseApi(tier: SubscriptionTier): boolean {
  return hasFeature(tier, "api");
}

export function canManageMultipleRestaurants(tier: SubscriptionTier): boolean {
  return PLANS[tier].includedRestaurants > 1 || PLANS[tier].extraRestaurantPrice !== null;
}

export type { PlanId };
