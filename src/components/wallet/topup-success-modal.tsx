"use client";

import { Check, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import type { WalletTransaction } from "@/lib/types";

/**
 * Surfaces a Stripe top-up success right after the customer comes back
 * from Stripe Checkout. The webhook is what really credits the wallet —
 * here we only show the receipt the user just paid for.
 */
export function TopupSuccessModal({
  open,
  transaction,
  onClose,
}: {
  open: boolean;
  transaction: WalletTransaction | null;
  onClose: () => void;
}) {
  // Try to split the description into base + bonus when the webhook formatted
  // it as "Recharge X € + Y € offerts". Otherwise just show the credited
  // amount as a single line.
  let basePart: number | null = null;
  let bonusPart: number | null = null;
  const desc = transaction?.description ?? null;
  const match = desc?.match(
    /Recharge\s+([0-9]+(?:\.[0-9]+)?)\s*€\s*\+\s*([0-9]+(?:\.[0-9]+)?)\s*€\s*offerts/i,
  );
  if (match) {
    basePart = Math.round(parseFloat(match[1]) * 100);
    bonusPart = Math.round(parseFloat(match[2]) * 100);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm overflow-hidden border-emerald-200 bg-white p-0 sm:rounded-2xl">
        <DialogTitle className="sr-only">
          Recharge confirmée
        </DialogTitle>

        {/* Hero */}
        <div className="relative bg-gradient-to-b from-emerald-50 to-white px-6 pb-4 pt-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
            <Check className="h-7 w-7" strokeWidth={3} />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-zinc-900">
            Merci !
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Votre solde a bien été rechargé.
          </p>
        </div>

        {/* Receipt */}
        <div className="space-y-3 px-6 pb-3">
          {transaction && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-700/70">
                Crédit ajouté
              </p>
              <p className="mt-1 text-3xl font-black text-emerald-700 tabular-nums">
                + {formatPrice(transaction.amount)}
              </p>
              {bonusPart !== null && basePart !== null && (
                <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                  <Sparkles className="h-3 w-3" />
                  dont {formatPrice(bonusPart)} offerts
                </p>
              )}
            </div>
          )}

          {transaction && (
            <div className="flex items-baseline justify-between rounded-xl bg-zinc-50 px-4 py-3">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Nouveau solde
              </span>
              <span className="text-lg font-bold tabular-nums text-zinc-900">
                {formatPrice(transaction.balance_after)}
              </span>
            </div>
          )}

          <p className="text-center text-[11px] text-zinc-500">
            Un reçu vous a été envoyé par email.
          </p>
        </div>

        <div className="px-6 pb-6 pt-2">
          <Button
            type="button"
            onClick={onClose}
            className="h-11 w-full rounded-full bg-emerald-600 text-sm font-semibold hover:bg-emerald-700"
          >
            Continuer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
