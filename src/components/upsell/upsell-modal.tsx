"use client";

import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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

type UpsellModalProps =
  | {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      kind: "feature";
      feature: FeatureKey;
      restaurantPublicId: string;
      /** Override the auto-detected required plan (e.g. force "groupe" for API). */
      requiredPlan?: PlanId;
    }
  | {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      kind: "addon";
      addon: AddonId;
      restaurantPublicId: string;
    };

export function UpsellModal(props: UpsellModalProps) {
  const router = useRouter();

  const title =
    props.kind === "feature"
      ? FEATURE_LABELS[props.feature]
      : ADDONS[props.addon].name;

  const benefit =
    props.kind === "feature"
      ? FEATURE_BENEFITS[props.feature]
      : ADDONS[props.addon].description;

  const targetPlanId =
    props.kind === "feature"
      ? props.requiredPlan ?? requiredPlanFor(props.feature) ?? "pro"
      : null;

  const targetPlan = targetPlanId ? PLANS[targetPlanId] : null;
  const addonPrice =
    props.kind === "addon" ? ADDONS[props.addon].monthlyPrice : null;

  const ctaLabel =
    props.kind === "feature" && targetPlan
      ? `Passer au plan ${targetPlan.name} — ${targetPlan.monthlyPrice} €/mois`
      : props.kind === "addon" && addonPrice !== null
      ? `Activer le module — +${addonPrice} €/mois`
      : "Mettre à niveau";

  const subtitle =
    props.kind === "feature" && targetPlan
      ? `Disponible à partir du plan ${targetPlan.name}`
      : props.kind === "addon"
      ? `Module activable depuis votre admin`
      : "";

  const handleCta = () => {
    if (props.kind === "feature") {
      router.push(
        `/admin/${props.restaurantPublicId}/settings?tab=account&upgrade=${targetPlanId ?? "pro"}`,
      );
    } else if (props.kind === "addon") {
      const path =
        props.addon === "stock"
          ? `/admin/${props.restaurantPublicId}/stock/activation`
          : `/admin/${props.restaurantPublicId}/settings?tab=delivery`;
      router.push(path);
    }
    props.onOpenChange(false);
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Lock className="h-5 w-5" />
          </div>
          <DialogTitle className="text-lg">{title}</DialogTitle>
          {subtitle && (
            <DialogDescription className="text-sm">
              {subtitle}
            </DialogDescription>
          )}
        </DialogHeader>

        <p className="text-sm leading-relaxed text-muted-foreground">
          {benefit}
        </p>

        <DialogFooter className="mt-2 flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="ghost"
            onClick={() => props.onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Pas maintenant
          </Button>
          <Button onClick={handleCta} className="w-full sm:w-auto">
            {ctaLabel} <span className="ml-1">→</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
