"use client";

import { useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { usePlan } from "@/hooks/use-plan";
import { LockedFeaturePlaceholder } from "./locked-feature-placeholder";
import { UpsellModal } from "./upsell-modal";
import type { AddonId, FeatureKey, PlanId } from "@/lib/plans";

type CommonProps = {
  children: ReactNode;
  /** Render mode when the gate is locked.
   *
   * - `placeholder`: render a `<LockedFeaturePlaceholder>` in place of children
   *   (use for full pages or large sections).
   * - `silent`: render nothing — useful when wrapping inline UI like a single
   *   button that has its own placeholder logic.
   * - `modal-on-click`: clone children and intercept clicks to open the upsell
   *   modal instead of the underlying behavior. Use when you want the button
   *   to remain visible and clickable, but the action gated.
   */
  fallback?: "placeholder" | "silent" | "modal-on-click";
};

type FeatureGateProps = CommonProps &
  (
    | { feature: FeatureKey; addon?: never; requiredPlan?: PlanId }
    | { feature?: never; addon: AddonId }
  );

/**
 * Gates UI based on the active restaurant's plan or add-ons.
 *
 * Examples:
 *
 *   <FeatureGate feature="floorPlan">
 *     <FloorPlanEditor ... />
 *   </FeatureGate>
 *
 *   <FeatureGate addon="livraison" fallback="silent">
 *     <DeliveryPanel ... />
 *   </FeatureGate>
 */
export function FeatureGate(props: FeatureGateProps) {
  const { children, fallback = "placeholder" } = props;
  const { hasFeature, hasAddon } = usePlan();
  const params = useParams<{ publicId: string }>();
  const restaurantPublicId = params?.publicId ?? "";
  const [modalOpen, setModalOpen] = useState(false);

  const allowed = props.feature
    ? hasFeature(props.feature)
    : hasAddon(props.addon!);

  if (allowed) return <>{children}</>;

  if (fallback === "silent") return null;

  if (fallback === "modal-on-click") {
    return (
      <>
        <span
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setModalOpen(true);
          }}
          style={{ display: "contents" }}
        >
          {children}
        </span>
        {props.feature ? (
          <UpsellModal
            open={modalOpen}
            onOpenChange={setModalOpen}
            kind="feature"
            feature={props.feature}
            requiredPlan={props.requiredPlan}
            restaurantPublicId={restaurantPublicId}
          />
        ) : (
          <UpsellModal
            open={modalOpen}
            onOpenChange={setModalOpen}
            kind="addon"
            addon={props.addon!}
            restaurantPublicId={restaurantPublicId}
          />
        )}
      </>
    );
  }

  // Default: placeholder
  return (
    <>
      <LockedFeaturePlaceholder
        {...(props.feature
          ? { kind: "feature", feature: props.feature, requiredPlan: props.requiredPlan }
          : { kind: "addon", addon: props.addon! })}
        onUpgradeClick={() => setModalOpen(true)}
      />
      {props.feature ? (
        <UpsellModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          kind="feature"
          feature={props.feature}
          requiredPlan={props.requiredPlan}
          restaurantPublicId={restaurantPublicId}
        />
      ) : (
        <UpsellModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          kind="addon"
          addon={props.addon!}
          restaurantPublicId={restaurantPublicId}
        />
      )}
    </>
  );
}
