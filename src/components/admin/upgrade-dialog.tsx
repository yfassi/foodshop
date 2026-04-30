"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Bike, Package, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  PLANS,
  ADDONS,
  isAddonAvailableOn,
  type PlanId,
  type AddonId,
} from "@/lib/plans";

const ADDON_ICONS = {
  delivery: Bike,
  stock: Package,
} as const;

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantSlug: string;
  currentTier: PlanId;
  deliveryActive: boolean;
  stockActive: boolean;
  onUpdated?: () => void;
  initialAddon?: AddonId;
  title?: string;
}

export function UpgradeDialog({
  open,
  onOpenChange,
  restaurantSlug,
  currentTier,
  deliveryActive,
  stockActive,
  onUpdated,
  initialAddon,
  title,
}: UpgradeDialogProps) {
  const router = useRouter();
  const [selectedTier, setSelectedTier] = useState<PlanId>(currentTier);
  const [delivery, setDelivery] = useState(deliveryActive);
  const [stock, setStock] = useState(stockActive);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedTier(currentTier);
      setDelivery(deliveryActive);
      setStock(stockActive);
      if (initialAddon === "delivery" && !deliveryActive) {
        setDelivery(true);
        if (currentTier === "essentiel") setSelectedTier("pro");
      }
      if (initialAddon === "stock" && !stockActive) {
        setStock(true);
      }
    }
  }, [open, currentTier, deliveryActive, stockActive, initialAddon]);

  // Drop delivery if tier doesn't support it
  useEffect(() => {
    if (delivery && !isAddonAvailableOn("delivery", selectedTier)) {
      setDelivery(false);
    }
  }, [selectedTier, delivery]);

  const monthlyTotal = (() => {
    const plan = PLANS.find((p) => p.id === selectedTier)!;
    let total = plan.price;
    if (delivery)
      total += ADDONS.find((a) => a.id === "delivery")!.price;
    if (stock) total += ADDONS.find((a) => a.id === "stock")!.price;
    return total;
  })();

  const hasChanges =
    selectedTier !== currentTier ||
    delivery !== deliveryActive ||
    stock !== stockActive;

  const handleSave = async () => {
    if (!hasChanges) {
      onOpenChange(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_slug: restaurantSlug,
          subscription_tier: selectedTier,
          delivery_addon_active: delivery,
          stock_addon_active: stock,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Erreur lors de la mise à jour");
        setSaving(false);
        return;
      }
      toast.success("Abonnement mis à jour");
      onOpenChange(false);
      onUpdated?.();
      router.refresh();
    } catch {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            {title || "Faites grandir votre restaurant"}
          </DialogTitle>
          <DialogDescription>
            Changez de plan ou activez des modules. Annulable à tout moment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Plan
            </p>
            <div className="space-y-2">
              {PLANS.map((plan) => {
                const selected = selectedTier === plan.id;
                const isCurrent = currentTier === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedTier(plan.id)}
                    className={`relative w-full rounded-xl border-2 p-3 text-left transition-all ${
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-2 left-3 rounded-full bg-primary px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary-foreground">
                        {plan.badge}
                      </span>
                    )}
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          {plan.name}
                          {isCurrent && (
                            <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                              Actuel
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {plan.sub}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-base font-bold">
                          {plan.price}€
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          /mois HT
                        </span>
                      </div>
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30"
                        }`}
                      >
                        {selected && <Check className="h-3 w-3" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Modules complémentaires
            </p>
            <div className="space-y-2">
              {ADDONS.map((addon) => {
                const Icon = ADDON_ICONS[addon.id];
                const available = isAddonAvailableOn(addon.id, selectedTier);
                const checked =
                  addon.id === "delivery" ? delivery : stock;
                const setChecked =
                  addon.id === "delivery" ? setDelivery : setStock;
                const isCurrent =
                  addon.id === "delivery" ? deliveryActive : stockActive;
                return (
                  <button
                    key={addon.id}
                    type="button"
                    disabled={!available}
                    onClick={() => setChecked(!checked)}
                    className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                      !available
                        ? "cursor-not-allowed border-dashed border-muted-foreground/20 bg-muted/30 opacity-60"
                        : checked
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        checked
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {addon.name}{" "}
                        <span className="text-[11px] font-medium text-primary">
                          {addon.highlight}
                        </span>
                        {isCurrent && (
                          <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                            Actif
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {available
                          ? addon.description
                          : `Disponible à partir du plan ${PLANS.find((p) => addon.availableOn.includes(p.id))?.name}`}
                      </p>
                    </div>
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      }`}
                    >
                      {checked && <Check className="h-3 w-3" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
            <span className="text-xs font-medium text-muted-foreground">
              Total mensuel
            </span>
            <span className="text-base font-bold">
              {monthlyTotal}€{" "}
              <span className="text-[10px] font-medium text-muted-foreground">
                /mois HT
              </span>
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={saving}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="flex-1"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Confirmer"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
