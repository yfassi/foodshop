"use client";

import { useState } from "react";
import { Sparkles, Loader2, ExternalLink, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  TIER_ORDER,
  getTierLabel,
  getTierPrice,
  DELIVERY_ADDON_PRICE_EUR,
  STOCK_ADDON_PRICE_EUR,
  TRIAL_DAYS,
  isSubscriptionUsable,
  isSubscriptionPastDue,
} from "@/lib/subscription";
import type {
  SubscriptionTier,
  StripeSubscriptionStatus,
} from "@/lib/types";

const TIER_FEATURES: Record<SubscriptionTier, string[]> = {
  plat: [
    "Commandes en ligne illimitées",
    "Paiement Stripe inclus",
    "QR codes illimités",
    "Programme client de base",
  ],
  menu: [
    "Tout Le Plat, plus :",
    "Plan de salle",
    "Programme de fidélité",
    "Paiement fractionné",
    "Export CSV",
  ],
  carte: [
    "Tout Le Menu, plus :",
    "Jusqu'à 5 établissements",
    "Clés API & webhooks",
    "Support dédié",
  ],
};

const STATUS_LABEL: Record<StripeSubscriptionStatus, string> = {
  trialing: "Période d'essai",
  active: "Actif",
  past_due: "Paiement en retard",
  canceled: "Annulé",
  unpaid: "Impayé",
  incomplete: "Incomplet",
  incomplete_expired: "Expiré",
  paused: "En pause",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export interface SubscriptionManagerProps {
  slug: string;
  tier: SubscriptionTier;
  status: StripeSubscriptionStatus | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  deliveryAddonActive: boolean;
  stockModuleActive: boolean;
  hasSubscription: boolean;
}

export function SubscriptionManager({
  slug,
  tier,
  status,
  currentPeriodEnd,
  trialEndsAt,
  deliveryAddonActive,
  stockModuleActive,
  hasSubscription,
}: SubscriptionManagerProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(
    hasSubscription ? tier : "menu",
  );
  const [withDelivery, setWithDelivery] = useState(deliveryAddonActive);
  const [withStock, setWithStock] = useState(stockModuleActive);
  const [submitting, setSubmitting] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const isUsable = isSubscriptionUsable(status);
  const isPastDue = isSubscriptionPastDue(status);

  async function handleStartCheckout() {
    setSubmitting(true);
    try {
      const addons: Array<"delivery" | "stock"> = [];
      if (withDelivery && selectedTier !== "plat") addons.push("delivery");
      if (withStock && selectedTier !== "plat") addons.push("stock");

      const res = await fetch("/api/admin/subscription/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_slug: slug,
          tier: selectedTier,
          interval: "monthly",
          addons,
          with_trial: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        toast.error(data.error || "Impossible de démarrer le paiement");
        setSubmitting(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("Erreur lors du démarrage du paiement");
      setSubmitting(false);
    }
  }

  async function handleOpenPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/admin/subscription/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_slug: slug }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        toast.error(data.error || "Portail indisponible");
        setPortalLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("Portail indisponible");
      setPortalLoading(false);
    }
  }

  return (
    <>
      <Card size="sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm">Mon abonnement</CardTitle>
              <CardDescription className="text-xs">
                {hasSubscription
                  ? `${getTierLabel(tier)} — ${getTierPrice(tier)} €/mois`
                  : "Aucun abonnement actif"}
              </CardDescription>
            </div>
            {status && (
              <Badge
                variant={isPastDue ? "destructive" : isUsable ? "default" : "secondary"}
                className="shrink-0"
              >
                {STATUS_LABEL[status]}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasSubscription && isUsable && (
            <div className="space-y-1.5 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              {status === "trialing" && trialEndsAt && (
                <p>Essai gratuit jusqu&apos;au {formatDate(trialEndsAt)}</p>
              )}
              {currentPeriodEnd && (
                <p>
                  Prochain prélèvement le{" "}
                  <span className="font-medium text-foreground">
                    {formatDate(currentPeriodEnd)}
                  </span>
                </p>
              )}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {deliveryAddonActive && (
                  <Badge variant="outline" className="text-[10px]">
                    Livraison +{DELIVERY_ADDON_PRICE_EUR}€/mois
                  </Badge>
                )}
                {stockModuleActive && (
                  <Badge variant="outline" className="text-[10px]">
                    Stock +{STOCK_ADDON_PRICE_EUR}€/mois
                  </Badge>
                )}
              </div>
            </div>
          )}

          {isPastDue && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              Le dernier paiement a échoué. Mettez à jour votre carte pour
              continuer à utiliser TaapR.
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            {hasSubscription ? (
              <Button
                onClick={handleOpenPortal}
                disabled={portalLoading}
                variant="outline"
                className="w-full"
              >
                {portalLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="mr-2 h-4 w-4" />
                )}
                Gérer l&apos;abonnement
              </Button>
            ) : (
              <Button onClick={() => setPickerOpen(true)} className="w-full">
                <Sparkles className="mr-2 h-4 w-4" />
                Choisir un plan
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Choisir votre plan</DialogTitle>
            <DialogDescription>
              {TRIAL_DAYS} jours d&apos;essai gratuit. Annulation à tout moment.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-3">
            {TIER_ORDER.map((t) => {
              const isSelected = selectedTier === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTier(t)}
                  className={cn(
                    "flex flex-col gap-2 rounded-xl border p-4 text-left transition",
                    isSelected
                      ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      {getTierLabel(t)}
                    </span>
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{getTierPrice(t)}</span>
                    <span className="text-xs text-muted-foreground">€/mois</span>
                  </div>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {TIER_FEATURES[t].map((f) => (
                      <li key={f} className="flex items-start gap-1.5">
                        <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          {selectedTier !== "plat" && (
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
              <p className="text-xs font-medium">Modules complémentaires</p>
              <div className="flex items-center justify-between">
                <Label htmlFor="addon-delivery" className="text-sm font-normal">
                  Livraison
                  <span className="ml-1 text-xs text-muted-foreground">
                    +{DELIVERY_ADDON_PRICE_EUR} €/mois
                  </span>
                </Label>
                <Switch
                  id="addon-delivery"
                  checked={withDelivery}
                  onCheckedChange={setWithDelivery}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="addon-stock" className="text-sm font-normal">
                  Gestion de stock
                  <span className="ml-1 text-xs text-muted-foreground">
                    +{STOCK_ADDON_PRICE_EUR} €/mois
                  </span>
                </Label>
                <Switch
                  id="addon-stock"
                  checked={withStock}
                  onCheckedChange={setWithStock}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPickerOpen(false)}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button onClick={handleStartCheckout} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continuer vers le paiement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
