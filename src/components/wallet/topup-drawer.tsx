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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const TOPUP_AMOUNTS = [500, 1000, 2000, 5000]; // in cents

export function TopupDrawer({
  slug,
  open,
  onClose,
}: {
  slug: string;
  open: boolean;
  onClose: () => void;
}) {
  const [selectedAmount, setSelectedAmount] = useState(1000);
  const [loading, setLoading] = useState(false);

  const handleTopup = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_slug: slug,
          amount: selectedAmount,
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
            {TOPUP_AMOUNTS.map((amount) => (
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
