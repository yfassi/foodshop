"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Loader2, Gift } from "lucide-react";
import { toast } from "sonner";
import type { WalletTopupTier } from "@/lib/types";

const DEFAULT_AMOUNTS = [500, 1000, 2000, 5000]; // in cents

export function TopupDrawer({
  publicId,
  open,
  onClose,
  tiers,
}: {
  publicId: string;
  open: boolean;
  onClose: () => void;
  tiers?: WalletTopupTier[];
}) {
  const hasTiers = tiers && tiers.length > 0;
  const sortedTiers = hasTiers
    ? [...tiers].sort((a, b) => a.amount - b.amount)
    : [];

  const defaultAmount = hasTiers ? sortedTiers[0].amount : 1000;
  const [selectedAmount, setSelectedAmount] = useState(defaultAmount);
  const [loading, setLoading] = useState(false);

  const selectedTier = hasTiers
    ? sortedTiers.find((t) => t.amount === selectedAmount)
    : null;
  const bonus = selectedTier?.bonus ?? 0;

  const handleTopup = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_public_id: publicId,
          amount: selectedAmount,
          ...(bonus > 0 && { bonus }),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de la recharge"
      );
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-3">
          <DrawerTitle className="text-lg font-bold">
            Recharger mon solde
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 py-4">
          <p className="mb-3 text-sm text-muted-foreground">
            Choisissez un montant
          </p>
          <div className="grid grid-cols-2 gap-2">
            {hasTiers
              ? sortedTiers.map((tier) => (
                  <button
                    key={tier.id}
                    onClick={() => setSelectedAmount(tier.amount)}
                    className={`relative rounded-xl border px-4 py-3 text-center transition-colors ${
                      selectedAmount === tier.amount
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border active:bg-accent"
                    }`}
                  >
                    <span className="text-sm font-semibold">
                      {formatPrice(tier.amount)}
                    </span>
                    {tier.bonus > 0 && (
                      <span className="mt-0.5 flex items-center justify-center gap-1 text-xs font-semibold text-green-600">
                        <Gift className="h-3 w-3" />+{formatPrice(tier.bonus)} offerts
                      </span>
                    )}
                    {tier.label && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                        {tier.label}
                      </span>
                    )}
                  </button>
                ))
              : DEFAULT_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setSelectedAmount(amount)}
                    className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                      selectedAmount === amount
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border active:bg-accent"
                    }`}
                  >
                    {formatPrice(amount)}
                  </button>
                ))}
          </div>

          {bonus > 0 && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Votre solde sera crédité de{" "}
              <span className="font-semibold text-foreground">
                {formatPrice(selectedAmount + bonus)}
              </span>
            </p>
          )}
        </div>

        <DrawerFooter className="border-t border-border pt-3">
          <Button
            onClick={handleTopup}
            disabled={loading}
            className="h-14 w-full rounded-xl text-base font-bold"
            size="lg"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              `Recharger ${formatPrice(selectedAmount)}`
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
