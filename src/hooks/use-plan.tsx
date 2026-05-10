"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  PLANS,
  type AddonId,
  type FeatureKey,
  type PlanId,
  type Plan,
} from "@/lib/plans";

interface PlanContextValue {
  planId: PlanId;
  plan: Plan;
  addons: AddonId[];
  hasFeature: (feature: FeatureKey) => boolean;
  hasAddon: (addon: AddonId) => boolean;
}

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({
  planId,
  addons,
  children,
}: {
  planId: PlanId;
  addons: AddonId[];
  children: ReactNode;
}) {
  const value = useMemo<PlanContextValue>(() => {
    const plan = PLANS[planId];
    return {
      planId,
      plan,
      addons,
      hasFeature: (feature) => plan.features[feature],
      hasAddon: (addon) => addons.includes(addon),
    };
  }, [planId, addons]);

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

/**
 * Read the active restaurant's plan + add-ons.
 *
 * Must be called inside a `<PlanProvider>` (mounted by AdminShell). Throws if
 * called outside — the alternative would be silently returning a default
 * plan, which would defeat feature gating.
 */
export function usePlan(): PlanContextValue {
  const ctx = useContext(PlanContext);
  if (!ctx) {
    throw new Error("usePlan must be used inside <PlanProvider>");
  }
  return ctx;
}
