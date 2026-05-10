"use client";

import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ADDONS,
  FEATURE_BENEFITS,
  FEATURE_LABELS,
  PLANS,
  requiredPlanFor,
  type AddonId,
  type FeatureKey,
  type PlanId,
} from "@/lib/plans";

type Props = (
  | { kind: "feature"; feature: FeatureKey; requiredPlan?: PlanId }
  | { kind: "addon"; addon: AddonId }
) & {
  onUpgradeClick: () => void;
};

/**
 * Full-page placeholder rendered when a section is locked behind a higher
 * plan or an inactive add-on. Replaces the would-be empty page or 403 error
 * with a contextual upsell.
 */
export function LockedFeaturePlaceholder(props: Props) {
  const isAddon = props.kind === "addon";

  const title = isAddon
    ? `Module ${ADDONS[props.addon].name}`
    : FEATURE_LABELS[props.feature];

  const benefit = isAddon
    ? ADDONS[props.addon].description
    : FEATURE_BENEFITS[props.feature];

  const targetPlanId = isAddon
    ? null
    : props.requiredPlan ?? requiredPlanFor(props.feature) ?? "pro";

  const targetPlan = targetPlanId ? PLANS[targetPlanId] : null;
  const addonPrice = isAddon ? ADDONS[props.addon].monthlyPrice : null;

  const subtitle = targetPlan
    ? `Disponible avec le plan ${targetPlan.name}`
    : `Module activable — +${addonPrice} €/mois`;

  const ctaLabel = targetPlan
    ? `Passer au plan ${targetPlan.name} — ${targetPlan.monthlyPrice} €/mois`
    : `Activer le module — +${addonPrice} €/mois`;

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center md:p-12">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Lock className="h-5 w-5" />
      </div>
      <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
        {title}
      </h2>
      <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
        {subtitle}
      </p>
      <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {benefit}
      </p>
      <Button onClick={props.onUpgradeClick} className="mt-6 h-11 px-6">
        {ctaLabel} <span className="ml-1">→</span>
      </Button>
    </div>
  );
}
