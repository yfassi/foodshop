"use client";

import { useEffect, useState } from "react";
import { Sparkles, Loader2, Crown } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Tier = "essentiel" | "pro" | "business";
type VerificationStatus = "pending" | "verified" | "rejected";

interface DemoConfig {
  subscription_tier: Tier;
  delivery_addon_active: boolean;
  delivery_enabled: boolean;
  loyalty_enabled: boolean;
  queue_enabled: boolean;
  stripe_onboarding_complete: boolean;
  is_accepting_orders: boolean;
  verification_status: VerificationStatus;
}

const TIERS: { value: Tier; label: string; price: string; hint: string }[] = [
  { value: "essentiel", label: "Essentiel", price: "29 €", hint: "300 cmd / mois" },
  { value: "pro", label: "Pro", price: "49 €", hint: "Illimité + fidélité" },
  { value: "business", label: "Business", price: "79 €", hint: "Multi-restos + IA" },
];

const FEATURE_TOGGLES: {
  key: keyof Omit<DemoConfig, "subscription_tier" | "verification_status">;
  label: string;
  hint: string;
}[] = [
  { key: "delivery_addon_active", label: "Add-on livraison", hint: "Module +19 €/mois actif" },
  { key: "delivery_enabled", label: "Livraison visible", hint: "Onglet Livraison en navigation" },
  { key: "loyalty_enabled", label: "Programme fidélité", hint: "Points + paliers récompenses" },
  { key: "queue_enabled", label: "File d'attente digitale", hint: "Tickets pour gérer l'affluence" },
  { key: "stripe_onboarding_complete", label: "Stripe configuré", hint: "Paiement en ligne opérationnel" },
  { key: "is_accepting_orders", label: "Accepte les commandes", hint: "Ferme ou ouvre la prise de cmd" },
];

const VERIFICATION_OPTIONS: { value: VerificationStatus; label: string }[] = [
  { value: "verified", label: "Validé" },
  { value: "pending", label: "En vérification" },
  { value: "rejected", label: "Refusé" },
];

export function DemoControls({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [config, setConfig] = useState<DemoConfig | null>(null);

  useEffect(() => {
    if (!open || config) return;
    setLoading(true);
    fetch(`/api/admin/demo/config?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((data: DemoConfig | { error: string }) => {
        if ("error" in data) {
          toast.error(data.error);
          return;
        }
        setConfig(data);
      })
      .catch(() => toast.error("Impossible de charger la configuration"))
      .finally(() => setLoading(false));
  }, [open, slug, config]);

  const patch = async (updates: Partial<DemoConfig>, label: string) => {
    if (!config) return;
    const previous = config;
    setConfig({ ...config, ...updates });
    setSaving(label);
    try {
      const res = await fetch("/api/admin/demo/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, updates }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error || "Erreur");
      }
      // Full reload so client-rendered admin pages re-fetch their flags.
      window.location.reload();
    } catch (e) {
      setConfig(previous);
      toast.error(e instanceof Error ? e.message : "Erreur de sauvegarde");
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105 md:bottom-6"
        aria-label="Ouvrir les contrôles de démo"
      >
        <Sparkles className="h-4 w-4" />
        Démo
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Contrôles de démo
            </SheetTitle>
            <SheetDescription>
              Activez les plans et options pour montrer toutes les fonctionnalités.
            </SheetDescription>
          </SheetHeader>

          {loading || !config ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6 px-4 pb-6">
              {/* Plan selector */}
              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <Crown className="h-3.5 w-3.5 text-primary" />
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Plan
                  </Label>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {TIERS.map((tier) => {
                    const active = config.subscription_tier === tier.value;
                    const isSaving = saving === `tier:${tier.value}`;
                    return (
                      <button
                        key={tier.value}
                        type="button"
                        disabled={isSaving || active}
                        onClick={() =>
                          patch({ subscription_tier: tier.value }, `tier:${tier.value}`)
                        }
                        className={cn(
                          "flex items-center justify-between rounded-xl border-2 p-3.5 text-left transition-all",
                          active
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-muted-foreground/40"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">{tier.label}</p>
                            {active && (
                              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                                Actif
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {tier.hint}
                          </p>
                        </div>
                        <div className="ml-3 shrink-0 text-right">
                          {isSaving ? (
                            <Loader2 className="ml-auto h-4 w-4 animate-spin" />
                          ) : (
                            <span className="text-sm font-bold tabular-nums">
                              {tier.price}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Feature toggles */}
              <section className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Fonctionnalités
                </Label>
                <div className="divide-y divide-border rounded-xl border border-border">
                  {FEATURE_TOGGLES.map((feature) => {
                    const isSaving = saving === `feature:${feature.key}`;
                    return (
                      <div
                        key={feature.key}
                        className="flex items-center justify-between gap-3 px-3 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{feature.label}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {feature.hint}
                          </p>
                        </div>
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <Switch
                            checked={config[feature.key]}
                            onCheckedChange={(checked) =>
                              patch(
                                { [feature.key]: checked } as Partial<DemoConfig>,
                                `feature:${feature.key}`
                              )
                            }
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Verification status */}
              <section className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Statut de vérification
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {VERIFICATION_OPTIONS.map((opt) => {
                    const active = config.verification_status === opt.value;
                    const isSaving = saving === `verif:${opt.value}`;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={isSaving || active}
                        onClick={() =>
                          patch(
                            { verification_status: opt.value },
                            `verif:${opt.value}`
                          )
                        }
                        className={cn(
                          "flex items-center justify-center rounded-lg border-2 px-2 py-2 text-xs font-medium transition-all",
                          active
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-muted-foreground hover:border-muted-foreground/40"
                        )}
                      >
                        {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : opt.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              <p className="text-center text-[11px] text-muted-foreground">
                Les changements s&apos;appliquent immédiatement sur toutes les pages.
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
