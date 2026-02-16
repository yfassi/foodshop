"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice, formatDate } from "@/lib/format";
import { TopupDrawer } from "@/components/wallet/topup-drawer";
import type { WalletTransaction, WalletTxType } from "@/lib/types";
import {
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Gift,
  Wallet,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const TX_CONFIG: Record<
  WalletTxType,
  { label: string; icon: typeof ArrowDownLeft; colorClass: string; sign: "+" | "-" }
> = {
  topup_stripe: {
    label: "Recharge",
    icon: ArrowDownLeft,
    colorClass: "text-green-600 bg-green-50",
    sign: "+",
  },
  topup_admin: {
    label: "Crédit",
    icon: Gift,
    colorClass: "text-green-600 bg-green-50",
    sign: "+",
  },
  payment: {
    label: "Paiement",
    icon: ArrowUpRight,
    colorClass: "text-orange-600 bg-orange-50",
    sign: "-",
  },
  refund: {
    label: "Remboursement",
    icon: RotateCcw,
    colorClass: "text-blue-600 bg-blue-50",
    sign: "+",
  },
};

export function WalletLive({
  slug,
  walletId,
  initialBalance,
  initialTransactions,
}: {
  slug: string;
  walletId: string | null;
  initialBalance: number;
  initialTransactions: WalletTransaction[];
}) {
  const [balance, setBalance] = useState(initialBalance);
  const [transactions, setTransactions] =
    useState<WalletTransaction[]>(initialTransactions);
  const [topupOpen, setTopupOpen] = useState(false);

  const fetchTransactions = useCallback(async () => {
    const res = await fetch(
      `/api/wallet/transactions?restaurant_slug=${slug}`
    );
    const data = await res.json();
    if (data.transactions) {
      setTransactions(data.transactions);
    }
  }, [slug]);

  const fetchBalance = useCallback(async () => {
    const res = await fetch(`/api/wallet/balance?restaurant_slug=${slug}`);
    const data = await res.json();
    setBalance(data.balance ?? 0);
  }, [slug]);

  // Realtime subscription on wallet changes
  useEffect(() => {
    if (!walletId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`wallet-${walletId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "wallets",
          filter: `id=eq.${walletId}`,
        },
        (payload) => {
          const newBalance = (payload.new as { balance: number }).balance;
          setBalance(newBalance);
          // Re-fetch transactions when balance changes
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [walletId, fetchTransactions]);

  // Also listen for new transactions (INSERT) to catch them immediately
  useEffect(() => {
    if (!walletId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`wallet-tx-${walletId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "wallet_transactions",
          filter: `wallet_id=eq.${walletId}`,
        },
        (payload) => {
          const newTx = payload.new as WalletTransaction;
          setTransactions((prev) => [newTx, ...prev]);
          setBalance(newTx.balance_after);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [walletId]);

  // Refresh data after topup redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("wallet_topup") === "success") {
      fetchBalance();
      fetchTransactions();
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete("wallet_topup");
      window.history.replaceState({}, "", url.toString());
    }
  }, [fetchBalance, fetchTransactions]);

  return (
    <div className="space-y-4 px-4 pb-8 pt-4">
      {/* Balance card */}
      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <div className="mb-1 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Wallet className="h-4 w-4" />
          Mon solde
        </div>
        <p className="text-4xl font-bold text-primary">
          {formatPrice(balance)}
        </p>
        <Button
          onClick={() => setTopupOpen(true)}
          className="mt-4 h-12 rounded-xl px-8 text-base font-bold"
          size="lg"
        >
          <Plus className="mr-2 h-4 w-4" />
          Recharger
        </Button>
      </div>

      {/* Transaction history */}
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Historique
          </h3>
        </div>

        {transactions.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Aucune transaction pour le moment
          </div>
        ) : (
          <div className="divide-y divide-border">
            {transactions.map((tx) => {
              const config = TX_CONFIG[tx.type];
              const Icon = config.icon;
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${config.colorClass}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{config.label}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {tx.description || formatDate(tx.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-bold ${
                        config.sign === "+"
                          ? "text-green-600"
                          : "text-orange-600"
                      }`}
                    >
                      {config.sign}
                      {formatPrice(Math.abs(tx.amount))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatPrice(tx.balance_after)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Back link */}
      <div className="text-center">
        <Link
          href={`/${slug}`}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Retour au menu
        </Link>
      </div>

      <TopupDrawer
        slug={slug}
        open={topupOpen}
        onClose={() => setTopupOpen(false)}
      />
    </div>
  );
}
