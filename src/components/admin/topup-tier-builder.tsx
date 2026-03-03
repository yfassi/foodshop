"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Gift } from "lucide-react";
import type { WalletTopupTier } from "@/lib/types";
import { formatPrice } from "@/lib/format";

export function TopupTierBuilder({
  tiers,
  onChange,
}: {
  tiers: WalletTopupTier[];
  onChange: (tiers: WalletTopupTier[]) => void;
}) {
  const sorted = [...tiers].sort((a, b) => a.amount - b.amount);

  const addTier = () => {
    const maxAmount = sorted.length > 0 ? sorted[sorted.length - 1].amount : 0;
    const newTier: WalletTopupTier = {
      id: crypto.randomUUID(),
      amount: maxAmount + 1000,
      bonus: 0,
      label: "",
    };
    onChange([...tiers, newTier]);
  };

  const updateTier = (id: string, updates: Partial<WalletTopupTier>) => {
    onChange(tiers.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const removeTier = (id: string) => {
    onChange(tiers.filter((t) => t.id !== id));
  };

  return (
    <div className="space-y-5">
      {/* Preview cards */}
      {sorted.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Aperçu client
          </p>
          <div className="grid grid-cols-2 gap-2">
            {sorted.map((tier) => (
              <div
                key={tier.id}
                className="relative rounded-xl border border-border p-3 text-center"
              >
                <p className="text-lg font-bold">{formatPrice(tier.amount)}</p>
                {tier.bonus > 0 && (
                  <p className="mt-0.5 flex items-center justify-center gap-1 text-xs font-semibold text-green-600">
                    <Gift className="h-3 w-3" />+{formatPrice(tier.bonus)} offerts
                  </p>
                )}
                {tier.bonus > 0 && (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Solde crédité : {formatPrice(tier.amount + tier.bonus)}
                  </p>
                )}
                {tier.label && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    {tier.label}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tier config cards */}
      {sorted.map((tier, i) => (
        <div key={tier.id} className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </div>
              <span className="text-sm font-semibold">Palier {i + 1}</span>
            </div>
            <button
              onClick={() => removeTier(tier.id)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Montant (EUR)</Label>
                <Input
                  type="number"
                  min={1}
                  step={0.5}
                  value={tier.amount ? tier.amount / 100 : ""}
                  onChange={(e) => {
                    const euros = parseFloat(e.target.value) || 0;
                    updateTier(tier.id, { amount: Math.round(euros * 100) });
                  }}
                  placeholder="20.00"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Bonus offert (EUR)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={tier.bonus ? tier.bonus / 100 : ""}
                  onChange={(e) => {
                    const euros = parseFloat(e.target.value) || 0;
                    updateTier(tier.id, { bonus: Math.round(euros * 100) });
                  }}
                  placeholder="5.00"
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Badge (optionnel)</Label>
              <Input
                value={tier.label}
                onChange={(e) => updateTier(tier.id, { label: e.target.value })}
                placeholder="Ex: Populaire, Meilleure offre..."
                className="h-9 text-sm"
              />
            </div>
          </div>
        </div>
      ))}

      <Button variant="outline" onClick={addTier} className="w-full" type="button">
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Ajouter un palier
      </Button>
    </div>
  );
}
