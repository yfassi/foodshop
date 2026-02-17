"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice, formatDate } from "@/lib/format";
import { TopupDrawer } from "@/components/wallet/topup-drawer";
import type { LoyaltyTier, WalletTransaction, WalletTxType, OrderItem } from "@/lib/types";

interface AccountOrder {
  id: string;
  display_order_number: string | null;
  items: OrderItem[];
  status: string;
  total_price: number;
  payment_method: string;
  order_type: string | null;
  payment_source: string;
  paid: boolean;
  wallet_amount_used: number;
  created_at: string;
}
import {
  User,
  Gift,
  Wallet,
  ShoppingBag,
  ChevronDown,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Lock,
  Check,
  ArrowLeft,
  Mail,
  Phone,
  CalendarDays,
  CreditCard,
  Banknote,
  UtensilsCrossed,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const TX_CONFIG: Record<
  WalletTxType,
  { label: string; icon: typeof ArrowDownLeft; colorClass: string; sign: "+" | "-" }
> = {
  topup_stripe: { label: "Recharge", icon: ArrowDownLeft, colorClass: "text-green-600 bg-green-50", sign: "+" },
  topup_admin: { label: "Crédit", icon: Gift, colorClass: "text-green-600 bg-green-50", sign: "+" },
  payment: { label: "Paiement", icon: ArrowUpRight, colorClass: "text-orange-600 bg-orange-50", sign: "-" },
  refund: { label: "Remboursement", icon: RotateCcw, colorClass: "text-blue-600 bg-blue-50", sign: "+" },
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  new: { label: "Nouvelle", className: "bg-blue-100 text-blue-700" },
  preparing: { label: "En préparation", className: "bg-amber-100 text-amber-700" },
  ready: { label: "Prête", className: "bg-green-100 text-green-700" },
  done: { label: "Terminée", className: "bg-gray-100 text-gray-600" },
  cancelled: { label: "Annulée", className: "bg-orange-100 text-orange-700" },
};

type SectionKey = "loyalty" | "orders" | "wallet" | "profile";

function SectionToggle({
  sectionKey,
  icon: Icon,
  title,
  subtitle,
  badge,
  isOpen,
  onToggle,
  children,
}: {
  sectionKey: SectionKey;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  isOpen: boolean;
  onToggle: (key: SectionKey) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onToggle(sectionKey)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(sectionKey); } }}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-4"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-sm font-semibold">{title}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>
      {isOpen && (
        <div className="border-t border-border/50 px-4 pb-4 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

export function AccountPage({
  slug,
  profile,
  loyaltyEnabled,
  loyaltyTiers,
  totalPoints,
  walletId,
  walletBalance,
  walletTransactions,
  orders,
}: {
  slug: string;
  profile: {
    fullName: string;
    phone: string | null;
    email: string;
    createdAt: string;
  };
  loyaltyEnabled: boolean;
  loyaltyTiers: LoyaltyTier[];
  totalPoints: number;
  walletId: string | null;
  walletBalance: number;
  walletTransactions: WalletTransaction[];
  orders: AccountOrder[];
}) {
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(
    new Set(["wallet"])
  );
  const [balance, setBalance] = useState(walletBalance);
  const [transactions, setTransactions] = useState(walletTransactions);
  const [topupOpen, setTopupOpen] = useState(false);

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const fetchBalance = useCallback(async () => {
    const res = await fetch(`/api/wallet/balance?restaurant_slug=${slug}`);
    const data = await res.json();
    setBalance(data.balance ?? 0);
  }, [slug]);

  const fetchTransactions = useCallback(async () => {
    const res = await fetch(`/api/wallet/transactions?restaurant_slug=${slug}`);
    const data = await res.json();
    if (data.transactions) setTransactions(data.transactions);
  }, [slug]);

  // Realtime wallet updates
  useEffect(() => {
    if (!walletId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`account-wallet-${walletId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "wallets", filter: `id=eq.${walletId}` },
        (payload) => {
          setBalance((payload.new as { balance: number }).balance);
          fetchTransactions();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [walletId, fetchTransactions]);

  // Handle topup redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("wallet_topup") === "success") {
      fetchBalance();
      fetchTransactions();
      const url = new URL(window.location.href);
      url.searchParams.delete("wallet_topup");
      window.history.replaceState({}, "", url.toString());
    }
  }, [fetchBalance, fetchTransactions]);

  const sortedTiers = [...loyaltyTiers].sort((a, b) => a.points - b.points);
  const nextTier = sortedTiers.find((t) => t.points > totalPoints);
  const unlockedTiers = sortedTiers.filter((t) => t.points <= totalPoints);
  const maxTierPoints = sortedTiers.length > 0 ? sortedTiers[sortedTiers.length - 1].points : 100;
  const progressPercent = maxTierPoints > 0 ? Math.min((totalPoints / maxTierPoints) * 100, 100) : 0;

  return (
    <div className="space-y-3 px-4 pb-8 pt-4">
      {/* Header */}
      <div className="mb-2 flex items-center gap-3">
        <Link
          href={`/${slug}`}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors active:bg-muted/70"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold">Mon compte</h1>
          <p className="text-xs text-muted-foreground">{profile.fullName}</p>
        </div>
      </div>

      {/* ── Wallet Section ── */}
      <SectionToggle
        sectionKey="wallet"
        icon={Wallet}
        title="Mon portefeuille"
        subtitle={formatPrice(balance)}
        badge={
          <Button
            size="sm"
            variant="outline"
            className="h-7 rounded-full px-3 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              setTopupOpen(true);
            }}
          >
            <Plus className="mr-1 h-3 w-3" />
            Recharger
          </Button>
        }
        isOpen={openSections.has("wallet")}
        onToggle={toggleSection}
      >
        {transactions.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Aucune transaction pour le moment
          </p>
        ) : (
          <div className="divide-y divide-border">
            {transactions.map((tx) => {
              const config = TX_CONFIG[tx.type];
              const Icon = config.icon;
              return (
                <div key={tx.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.colorClass}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{config.label}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {tx.description || formatDate(tx.created_at)}
                    </p>
                  </div>
                  <p className={`text-sm font-bold ${config.sign === "+" ? "text-green-600" : "text-orange-600"}`}>
                    {config.sign}{formatPrice(Math.abs(tx.amount))}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </SectionToggle>

      {/* ── Points Section ── */}
      {loyaltyEnabled && sortedTiers.length > 0 && (
        <SectionToggle
          sectionKey="loyalty"
          icon={Gift}
          title="Mes points"
          subtitle={`${totalPoints} points cumulés`}
          badge={
            nextTier ? (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {nextTier.points - totalPoints} pts restants
              </span>
            ) : unlockedTiers.length > 0 ? (
              <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                Tout débloqué
              </span>
            ) : null
          }
          isOpen={openSections.has("loyalty")}
          onToggle={toggleSection}
        >
          {/* Points counter */}
          <div className="mb-5 text-center">
            <p className="text-4xl font-bold text-primary">{totalPoints}</p>
            <p className="text-sm text-muted-foreground">points de fidélité</p>
          </div>

          {/* Progress bar */}
          <div className="relative mb-8">
            <div className="h-3 w-full rounded-full bg-muted">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-700"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {/* Tier markers */}
            {sortedTiers.map((tier, i) => {
              const pos = maxTierPoints > 0 ? (tier.points / maxTierPoints) * 100 : 0;
              const unlocked = totalPoints >= tier.points;
              return (
                <div
                  key={tier.id}
                  className="absolute -translate-x-1/2"
                  style={{ left: `${Math.min(pos, 100)}%`, top: "-4px" }}
                >
                  <div
                    className={`flex h-[1.375rem] w-[1.375rem] items-center justify-center rounded-full border-2 text-[9px] font-bold shadow-sm transition-colors ${
                      unlocked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30 bg-background text-muted-foreground"
                    }`}
                  >
                    {unlocked ? <Check className="h-3 w-3" /> : i + 1}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tier cards */}
          <div className="space-y-2">
            {sortedTiers.map((tier) => {
              const unlocked = totalPoints >= tier.points;
              return (
                <div
                  key={tier.id}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                    unlocked
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-muted/30"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      unlocked
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {unlocked ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Lock className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${unlocked ? "text-foreground" : "text-muted-foreground"}`}>
                      {tier.label || (tier.reward_type === "free_product" ? "Article offert" : "Réduction")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tier.points} points
                      {!unlocked && ` — encore ${tier.points - totalPoints} pts`}
                    </p>
                  </div>
                  {unlocked && (
                    <span className="shrink-0 text-xs font-semibold text-primary">
                      Débloqué
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            1 EUR dépensé = 1 point de fidélité
          </p>
        </SectionToggle>
      )}

      {/* ── Orders Section ── */}
      <SectionToggle
        sectionKey="orders"
        icon={ShoppingBag}
        title="Mes commandes"
        subtitle={`${orders.length} commande${orders.length > 1 ? "s" : ""}`}
        isOpen={openSections.has("orders")}
        onToggle={toggleSection}
      >
        {orders.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Aucune commande pour le moment
          </p>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => {
              const statusConfig = STATUS_LABELS[order.status] ?? STATUS_LABELS.new;
              const items = order.items as OrderItem[];
              return (
                <div
                  key={order.id}
                  className="rounded-xl border border-border p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">
                        {order.display_order_number || `#${order.id.slice(0, 6)}`}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusConfig.className}`}
                      >
                        {statusConfig.label}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-primary">
                      {formatPrice(order.total_price)}
                    </span>
                  </div>

                  <div className="mb-2 space-y-0.5">
                    {items.slice(0, 3).map((item, i) => (
                      <p key={i} className="text-xs text-muted-foreground">
                        {item.quantity}x {item.product_name}
                        {item.modifiers.length > 0 && (
                          <span className="ml-1 text-muted-foreground/70">
                            ({item.modifiers.map((m) => m.modifier_name).join(", ")})
                          </span>
                        )}
                      </p>
                    ))}
                    {items.length > 3 && (
                      <p className="text-xs text-muted-foreground/70">
                        +{items.length - 3} autre{items.length - 3 > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      {order.payment_method === "online" ? (
                        <CreditCard className="h-3 w-3" />
                      ) : (
                        <Banknote className="h-3 w-3" />
                      )}
                      <span>
                        {order.payment_source === "wallet"
                          ? "Solde"
                          : order.payment_method === "online"
                            ? "Carte"
                            : "Comptoir"}
                      </span>
                      {order.order_type && (
                        <>
                          <span className="text-muted-foreground/40">·</span>
                          <UtensilsCrossed className="h-3 w-3" />
                          <span>
                            {order.order_type === "dine_in" ? "Sur place" : "À emporter"}
                          </span>
                        </>
                      )}
                    </div>
                    <span>{formatDate(order.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionToggle>

      {/* ── Profile Section ── */}
      <SectionToggle
        sectionKey="profile"
        icon={User}
        title="Mon profil"
        subtitle={profile.email}
        isOpen={openSections.has("profile")}
        onToggle={toggleSection}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2.5">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Nom</p>
              <p className="text-sm font-medium">{profile.fullName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2.5">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium">{profile.email}</p>
            </div>
          </div>
          {profile.phone && (
            <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2.5">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Téléphone</p>
                <p className="text-sm font-medium">{profile.phone}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2.5">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Membre depuis</p>
              <p className="text-sm font-medium">
                {new Date(profile.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      </SectionToggle>

      {/* Logout */}
      <button
        onClick={async () => {
          const supabase = createClient();
          await supabase.auth.signOut();
          window.location.href = `/${slug}`;
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-muted py-3 text-sm text-muted-foreground transition-colors active:bg-muted/70 active:text-foreground"
      >
        <LogOut className="h-4 w-4" />
        Déconnexion
      </button>

      {/* Back link */}
      <div className="pt-1 text-center">
        <Link
          href={`/${slug}`}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Retour au menu
        </Link>
      </div>

      <TopupDrawer slug={slug} open={topupOpen} onClose={() => setTopupOpen(false)} />
    </div>
  );
}
