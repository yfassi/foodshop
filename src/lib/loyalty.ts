export type LoyaltyTier = {
  key: "bronze" | "silver" | "gold" | "vip";
  label: string;
  icon: string;
  minOrders: number;
  minSpent: number; // cents
};

export const LOYALTY_TIERS: LoyaltyTier[] = [
  { key: "bronze", label: "Bronze", icon: "🥉", minOrders: 0, minSpent: 0 },
  { key: "silver", label: "Argent", icon: "🥈", minOrders: 5, minSpent: 2500 },
  { key: "gold", label: "Or", icon: "🥇", minOrders: 15, minSpent: 7500 },
  { key: "vip", label: "VIP", icon: "⭐️", minOrders: 30, minSpent: 20000 },
];

export type LoyaltyResult = {
  tier: LoyaltyTier;
  next: LoyaltyTier | null;
  progress: number; // 0..1 vers le palier suivant
  remainingOrders: number;
  remainingSpend: number;
  allTiers: LoyaltyTier[];
};

export function computeLoyalty(orderCount: number, totalSpent: number): LoyaltyResult {
  // Le tier est le plus haut palier dont les deux seuils sont atteints
  let currentIdx = 0;
  for (let i = 0; i < LOYALTY_TIERS.length; i += 1) {
    const t = LOYALTY_TIERS[i];
    if (orderCount >= t.minOrders && totalSpent >= t.minSpent) currentIdx = i;
  }
  const tier = LOYALTY_TIERS[currentIdx];
  const next = LOYALTY_TIERS[currentIdx + 1] || null;

  let progress = 1;
  let remainingOrders = 0;
  let remainingSpend = 0;
  if (next) {
    const ordersFrac = Math.min(
      1,
      (orderCount - tier.minOrders) /
        Math.max(1, next.minOrders - tier.minOrders)
    );
    const spendFrac = Math.min(
      1,
      (totalSpent - tier.minSpent) /
        Math.max(1, next.minSpent - tier.minSpent)
    );
    progress = Math.max(0, Math.min(ordersFrac, spendFrac));
    remainingOrders = Math.max(0, next.minOrders - orderCount);
    remainingSpend = Math.max(0, next.minSpent - totalSpent);
  }

  return {
    tier,
    next,
    progress,
    remainingOrders,
    remainingSpend,
    allTiers: LOYALTY_TIERS,
  };
}
