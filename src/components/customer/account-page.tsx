"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatPrice, formatDate } from "@/lib/format";
import { TopupDrawer } from "@/components/wallet/topup-drawer";
import { TopupSuccessModal } from "@/components/wallet/topup-success-modal";
import { useCartStore } from "@/stores/cart-store";
import type { LoyaltyTier, WalletTopupTier, WalletTransaction, WalletTxType, OrderItem } from "@/lib/types";

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
import Link from "next/link";

const TX_CONFIG: Record<
  WalletTxType,
  { label: string; icon: typeof ArrowDownLeft; iconBg: string; iconFg: string; sign: "+" | "-"; amountClass: string }
> = {
  topup_stripe: {
    label: "Recharge",
    icon: ArrowDownLeft,
    iconBg: "bg-[#d8efd9]",
    iconFg: "text-[#00873a]",
    sign: "+",
    amountClass: "text-[#00873a]",
  },
  topup_admin: {
    label: "Crédit",
    icon: Gift,
    iconBg: "bg-[#d8efd9]",
    iconFg: "text-[#00873a]",
    sign: "+",
    amountClass: "text-[#00873a]",
  },
  payment: {
    label: "Paiement",
    icon: ArrowUpRight,
    iconBg: "bg-[#fbe8e6]",
    iconFg: "text-[#d7352d]",
    sign: "-",
    amountClass: "text-[#d7352d]",
  },
  refund: {
    label: "Remboursement",
    icon: RotateCcw,
    iconBg: "bg-[#d8e3f4]",
    iconFg: "text-[#172846]",
    sign: "+",
    amountClass: "text-[#172846]",
  },
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  new: { label: "Nouvelle", className: "bg-[#d8e3f4] text-[#172846]" },
  preparing: { label: "En préparation", className: "bg-[#fef3c6] text-[#b75000]" },
  ready: { label: "Prête", className: "bg-[#d8efd9] text-[#00873a]" },
  done: { label: "Terminée", className: "bg-[#f0ebe1] text-[#68625e]" },
  cancelled: { label: "Annulée", className: "bg-[#fbe8e6] text-[#d7352d]" },
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
    <div className="overflow-hidden rounded-[14px] border border-[#dbd7d2] bg-white">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onToggle(sectionKey)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(sectionKey); } }}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 active:bg-[#fdf9f3]"
      >
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#fdf9f3] text-[#1c1410]">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-[14px] font-extrabold tracking-[-0.01em] text-[#1c1410]">{title}</p>
          {subtitle && (
            <p className="mt-0.5 truncate text-[12px] text-[#68625e]">{subtitle}</p>
          )}
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#a89e94] transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>
      {isOpen && (
        <div
          className="px-4 pb-4 pt-3"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to right, #dbd7d2 0, #dbd7d2 4px, transparent 4px, transparent 8px)",
            backgroundSize: "100% 1px",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "top",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function AccountPage({
  publicId,
  profile,
  loyaltyEnabled,
  loyaltyTiers,
  totalPoints,
  walletId,
  walletBalance,
  walletTransactions,
  orders,
  topupTiers,
}: {
  publicId: string;
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
  topupTiers?: WalletTopupTier[];
}) {
  const hasUnlockedReward = loyaltyEnabled && loyaltyTiers.some((t) => totalPoints >= t.points);
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(
    () => new Set<SectionKey>(hasUnlockedReward ? ["loyalty", "wallet"] : ["wallet"])
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
    const res = await fetch(`/api/wallet/balance?restaurant_public_id=${publicId}`);
    const data = await res.json();
    setBalance(data.balance ?? 0);
  }, [publicId]);

  const fetchTransactions = useCallback(async () => {
    const res = await fetch(`/api/wallet/transactions?restaurant_public_id=${publicId}`);
    const data = await res.json();
    if (data.transactions) setTransactions(data.transactions);
  }, [publicId]);

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

  // Snapshot of transaction IDs we already knew about on first render —
  // anything new that shows up while `awaitingTopup` is true is the topup we
  // just paid for, and is what we display in the success modal.
  const knownTxIds = useRef<Set<string>>(
    new Set(walletTransactions.map((t) => t.id)),
  );
  const [awaitingTopup, setAwaitingTopup] = useState(false);
  const [topupSuccessTx, setTopupSuccessTx] = useState<WalletTransaction | null>(
    null,
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("wallet_topup") === "success") {
      setAwaitingTopup(true);
      fetchBalance();
      fetchTransactions();
      const url = new URL(window.location.href);
      url.searchParams.delete("wallet_topup");
      window.history.replaceState({}, "", url.toString());
    }
  }, [fetchBalance, fetchTransactions]);

  // While we're waiting for the webhook to credit, retry every 1.5s for up
  // to ~12s in case realtime hasn't pushed the new transaction yet.
  useEffect(() => {
    if (!awaitingTopup) return;
    let attempts = 0;
    const id = window.setInterval(() => {
      attempts += 1;
      fetchBalance();
      fetchTransactions();
      if (attempts >= 8) window.clearInterval(id);
    }, 1500);
    return () => window.clearInterval(id);
  }, [awaitingTopup, fetchBalance, fetchTransactions]);

  // Whenever the transactions list changes, surface the first NEW
  // topup_stripe row as the success modal payload. Then clear the flag.
  useEffect(() => {
    if (!awaitingTopup) {
      // Keep our snapshot fresh once the modal has been shown.
      for (const t of transactions) knownTxIds.current.add(t.id);
      return;
    }
    for (const t of transactions) {
      if (!knownTxIds.current.has(t.id) && t.type === "topup_stripe") {
        setTopupSuccessTx(t);
        setAwaitingTopup(false);
        break;
      }
    }
    for (const t of transactions) knownTxIds.current.add(t.id);
  }, [transactions, awaitingTopup]);

  const sortedTiers = [...loyaltyTiers].sort((a, b) => a.points - b.points);
  const nextTier = sortedTiers.find((t) => t.points > totalPoints);
  const unlockedTiers = sortedTiers.filter((t) => t.points <= totalPoints);
  const maxTierPoints = sortedTiers.length > 0 ? sortedTiers[sortedTiers.length - 1].points : 100;
  const progressPercent = maxTierPoints > 0 ? Math.min((totalPoints / maxTierPoints) * 100, 100) : 0;

  const cartItems = useCartStore((s) => s.items);
  const addCartItem = useCartStore((s) => s.addItem);
  const removeCartItem = useCartStore((s) => s.removeItem);
  const setCartRestaurantPublicId = useCartStore((s) => s.setRestaurantPublicId);
  const loyaltyReward = useCartStore((s) => s.loyaltyReward);
  const setLoyaltyReward = useCartStore((s) => s.setLoyaltyReward);

  const findRewardLine = (tier: LoyaltyTier) =>
    tier.product_id
      ? cartItems.find(
          (it) => it.product_id === tier.product_id && it.base_price === 0
        )
      : undefined;

  const isDiscountActive = (tier: LoyaltyTier) =>
    tier.reward_type === "discount" && loyaltyReward?.tier_id === tier.id;

  const handleClaimReward = (tier: LoyaltyTier) => {
    if (tier.reward_type === "discount") {
      if (!tier.discount_amount || tier.discount_amount <= 0) return;
      if (isDiscountActive(tier)) {
        setLoyaltyReward(null);
        toast(`${tier.label || "Réduction"} retirée du panier`);
        return;
      }
      setCartRestaurantPublicId(publicId);
      setLoyaltyReward({
        tier_id: tier.id,
        points: tier.points,
        discount_amount: tier.discount_amount,
        label: tier.label || `${(tier.discount_amount / 100).toFixed(2)} € offerts`,
      });
      toast.success(
        `${tier.label || "Réduction"} appliquée à votre prochaine commande`
      );
      return;
    }

    if (tier.reward_type === "free_product" && tier.product_id) {
      const productName = tier.product_name ?? tier.label ?? "Article offert";
      const existing = findRewardLine(tier);
      if (existing) {
        removeCartItem(existing.id);
        toast(`${productName} retiré de votre panier`);
        return;
      }
      setCartRestaurantPublicId(publicId);
      addCartItem({
        product_id: tier.product_id,
        product_name: `${productName} (offert)`,
        base_price: 0,
        quantity: 1,
        modifiers: [],
        is_menu: false,
        menu_supplement: 0,
      });
      toast.success(`${productName} ajouté gratuitement à votre commande`);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdf9f3]">
      <div className="mx-auto max-w-md space-y-3 px-4 pb-10 pt-4">
        {/* Header */}
        <div className="mb-2 flex items-center gap-3">
          <Link
            href={`/restaurant/${publicId}/order`}
            className="grid h-9 w-9 place-items-center rounded-full border border-[#dbd7d2] bg-white text-[#1c1410] transition-colors active:bg-[#fdf9f3]"
            aria-label="Retour au menu"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-[20px] font-extrabold tracking-[-0.02em] text-[#1c1410]">
              Mon compte
            </h1>
            <p className="truncate text-[12px] text-[#68625e]">{profile.fullName}</p>
          </div>
        </div>

        {/* Wallet section */}
        <SectionToggle
          sectionKey="wallet"
          icon={Wallet}
          title="Mon portefeuille"
          subtitle={formatPrice(balance)}
          badge={
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTopupOpen(true);
              }}
              className="inline-flex h-8 items-center gap-1 rounded-full bg-[#d7352d] px-3 text-[11px] font-bold uppercase tracking-[0.04em] text-white shadow-[0_0_12px_#d7352d4d] transition-colors active:bg-[#bf2c25]"
            >
              <Plus className="h-3 w-3" strokeWidth={3} />
              Recharger
            </button>
          }
          isOpen={openSections.has("wallet")}
          onToggle={toggleSection}
        >
          {transactions.length === 0 ? (
            <p className="py-4 text-center text-[13px] text-[#68625e]">
              Aucune transaction pour le moment
            </p>
          ) : (
            <div className="divide-y divide-[#f0ebe1]">
              {transactions.map((tx) => {
                const config = TX_CONFIG[tx.type];
                const Icon = config.icon;
                return (
                  <div key={tx.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${config.iconBg} ${config.iconFg}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-[#1c1410]">{config.label}</p>
                      <p className="truncate text-[11px] text-[#68625e]">
                        {tx.description || formatDate(tx.created_at)}
                      </p>
                    </div>
                    <p className={`font-mono text-[13px] font-bold ${config.amountClass}`}>
                      {config.sign}{formatPrice(Math.abs(tx.amount))}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </SectionToggle>

        {/* Loyalty section */}
        {loyaltyEnabled && sortedTiers.length > 0 && (
          <SectionToggle
            sectionKey="loyalty"
            icon={Gift}
            title="Mes points"
            subtitle={`${totalPoints} points cumulés`}
            badge={
              nextTier ? (
                <span className="rounded-full bg-[#fbe8e6] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.04em] text-[#d7352d]">
                  {nextTier.points - totalPoints} pts
                </span>
              ) : unlockedTiers.length > 0 ? (
                <span className="rounded-full bg-[#d8efd9] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.04em] text-[#00873a]">
                  Tout débloqué
                </span>
              ) : null
            }
            isOpen={openSections.has("loyalty")}
            onToggle={toggleSection}
          >
            {/* Loyalty hero — kit: navy bg + red glow */}
            <div className="loyalty-card-bg relative mb-5 overflow-hidden rounded-[14px] px-5 py-6 text-center text-[#f8f1e7]">
              <div className="relative">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#d7352d]">
                  Points de fidélité
                </p>
                <p className="mt-1 font-mono text-[44px] font-extrabold leading-none tracking-[-0.02em] text-white">
                  {totalPoints}
                </p>
                {nextTier ? (
                  <p className="mt-3 text-[12px] text-[#f8f1e7]/85">
                    Encore{" "}
                    <span className="font-mono font-bold text-white">
                      {nextTier.points - totalPoints} pts
                    </span>{" "}
                    pour débloquer{" "}
                    <span className="font-bold text-white">
                      {nextTier.label || nextTier.product_name || "votre récompense"}
                    </span>
                  </p>
                ) : (
                  <p className="mt-3 text-[12px] font-semibold text-white">
                    Toutes les récompenses sont à vous
                  </p>
                )}
              </div>
            </div>

            {/* Progress bar with milestones */}
            <div className="relative mb-7 px-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#f0ebe1]">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${progressPercent}%`,
                    background: "linear-gradient(90deg, #d7352d, #f56e54)",
                  }}
                />
              </div>
              {sortedTiers.map((tier, i) => {
                const pos = maxTierPoints > 0 ? (tier.points / maxTierPoints) * 100 : 0;
                const unlocked = totalPoints >= tier.points;
                return (
                  <div
                    key={tier.id}
                    className="absolute -translate-x-1/2"
                    style={{ left: `${Math.min(pos, 100)}%`, top: "-5px" }}
                  >
                    <div
                      className={`grid h-5 w-5 place-items-center rounded-full border-2 text-[9px] font-bold transition-colors ${
                        unlocked
                          ? "border-[#d7352d] bg-[#d7352d] text-white"
                          : "border-[#dbd7d2] bg-white text-[#a89e94]"
                      }`}
                    >
                      {unlocked ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : i + 1}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tier reward cards */}
            <div className="space-y-2">
              {sortedTiers.map((tier) => {
                const unlocked = totalPoints >= tier.points;
                const isFreeProduct =
                  tier.reward_type === "free_product" && !!tier.product_id;
                const isDiscount =
                  tier.reward_type === "discount" &&
                  !!tier.discount_amount &&
                  tier.discount_amount > 0;
                const claimable = unlocked && (isFreeProduct || isDiscount);
                const inCart = isFreeProduct
                  ? !!findRewardLine(tier)
                  : isDiscount
                    ? isDiscountActive(tier)
                    : false;
                const ptsLeft = tier.points - totalPoints;
                const title =
                  tier.label ||
                  tier.product_name ||
                  (tier.reward_type === "free_product"
                    ? "Article offert"
                    : "Réduction");

                const Wrapper = claimable ? "button" : "div";
                const wrapperProps = claimable
                  ? {
                      type: "button" as const,
                      onClick: () => handleClaimReward(tier),
                      "aria-label": inCart
                        ? `Retirer ${title} du panier`
                        : `Ajouter ${title} gratuitement à votre commande`,
                    }
                  : {};

                return (
                  <Wrapper
                    key={tier.id}
                    {...wrapperProps}
                    className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-[14px] border-[1.5px] px-3 py-3 text-left transition-all ${
                      inCart
                        ? "border-[#00873a] bg-[#d8efd9]/40 active:scale-[0.98]"
                        : claimable
                        ? "border-[#d7352d] bg-[#fbe8e6]/50 active:scale-[0.98]"
                        : unlocked
                        ? "border-[#dbd7d2] bg-white"
                        : "border-[#dbd7d2] bg-[#fdf9f3]"
                    }`}
                  >
                    <div
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${
                        inCart
                          ? "bg-[#00873a] text-white"
                          : claimable
                          ? "bg-[#d7352d] text-white shadow-[0_0_12px_#d7352d4d]"
                          : unlocked
                          ? "bg-[#1c1410] text-white"
                          : "bg-[#f0ebe1] text-[#a89e94]"
                      }`}
                    >
                      {unlocked ? (
                        inCart ? (
                          <Check className="h-5 w-5" strokeWidth={3} />
                        ) : (
                          <Gift className="h-4 w-4" />
                        )
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p
                          className={`truncate text-[13px] font-extrabold tracking-[-0.01em] ${
                            unlocked ? "text-[#1c1410]" : "text-[#68625e]"
                          }`}
                        >
                          {title}
                        </p>
                        {claimable && !inCart && (
                          <span className="shrink-0 rounded-full bg-[#d7352d] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] text-white">
                            Offert
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-[#68625e]">
                        {!unlocked
                          ? `Encore ${ptsLeft} pts à gagner`
                          : inCart
                          ? isDiscount
                            ? "Appliquée à votre prochaine commande · touchez pour retirer"
                            : "Dans votre panier · touchez pour retirer"
                          : claimable
                          ? isDiscount
                            ? "Touchez pour l'appliquer à votre prochaine commande"
                            : "Touchez pour l'ajouter à votre commande"
                          : `${tier.points} pts · débloqué`}
                      </p>
                      {!unlocked && (
                        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#f0ebe1]">
                          <div
                            className="h-full rounded-full bg-[#d7352d]/60 transition-all duration-500"
                            style={{
                              width: `${Math.min(
                                (totalPoints / tier.points) * 100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {claimable && (
                      <span
                        className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.04em] transition-colors ${
                          inCart
                            ? "bg-[#00873a] text-white"
                            : "bg-[#1c1410] text-white"
                        }`}
                      >
                        {isDiscount
                          ? inCart ? "Appliquée" : "Appliquer"
                          : inCart ? "Ajouté" : "Ajouter"}
                      </span>
                    )}
                  </Wrapper>
                );
              })}
            </div>

            <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-[#a89e94]">
              1 € dépensé = 1 point
            </p>
          </SectionToggle>
        )}

        {/* Orders section */}
        <SectionToggle
          sectionKey="orders"
          icon={ShoppingBag}
          title="Mes commandes"
          subtitle={`${orders.length} commande${orders.length > 1 ? "s" : ""}`}
          isOpen={openSections.has("orders")}
          onToggle={toggleSection}
        >
          {orders.length === 0 ? (
            <p className="py-4 text-center text-[13px] text-[#68625e]">
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
                    className="rounded-[14px] border border-[#dbd7d2] bg-white p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-mono text-[13px] font-bold text-[#1c1410]">
                          {order.display_order_number || `#${order.id.slice(0, 6)}`}
                        </span>
                        <span
                          className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] ${statusConfig.className}`}
                        >
                          {statusConfig.label}
                        </span>
                      </div>
                      <span className="shrink-0 font-mono text-[14px] font-extrabold text-[#1c1410]">
                        {formatPrice(order.total_price)}
                      </span>
                    </div>

                    <div className="mb-2 space-y-0.5">
                      {items.slice(0, 3).map((item, i) => (
                        <p key={i} className="text-[11px] text-[#68625e]">
                          <span className="font-mono font-bold text-[#1c1410]">{item.quantity}×</span>{" "}
                          {item.product_name}
                          {item.modifiers.length > 0 && (
                            <span className="ml-1 text-[#a89e94]">
                              ({item.modifiers.map((m) => m.modifier_name).join(", ")})
                            </span>
                          )}
                        </p>
                      ))}
                      {items.length > 3 && (
                        <p className="text-[11px] text-[#a89e94]">
                          +{items.length - 3} autre{items.length - 3 > 1 ? "s" : ""}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[11px] text-[#68625e]">
                      <div className="flex items-center gap-1.5">
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
                            <span className="text-[#dbd7d2]">·</span>
                            <UtensilsCrossed className="h-3 w-3" />
                            <span>
                              {order.order_type === "dine_in" ? "Sur place" : "À emporter"}
                            </span>
                          </>
                        )}
                      </div>
                      <span className="font-mono">{formatDate(order.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionToggle>

        {/* Profile section */}
        <SectionToggle
          sectionKey="profile"
          icon={User}
          title="Mon profil"
          subtitle={profile.email}
          isOpen={openSections.has("profile")}
          onToggle={toggleSection}
        >
          <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-[12px] bg-[#fdf9f3] px-3 py-2.5">
              <User className="h-4 w-4 shrink-0 text-[#a89e94]" />
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#a89e94]">Nom</p>
                <p className="truncate text-[13px] font-bold text-[#1c1410]">{profile.fullName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-[12px] bg-[#fdf9f3] px-3 py-2.5">
              <Mail className="h-4 w-4 shrink-0 text-[#a89e94]" />
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#a89e94]">Email</p>
                <p className="truncate text-[13px] font-bold text-[#1c1410]">{profile.email}</p>
              </div>
            </div>
            {profile.phone && (
              <div className="flex items-center gap-3 rounded-[12px] bg-[#fdf9f3] px-3 py-2.5">
                <Phone className="h-4 w-4 shrink-0 text-[#a89e94]" />
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#a89e94]">Téléphone</p>
                  <p className="truncate text-[13px] font-bold text-[#1c1410]">{profile.phone}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 rounded-[12px] bg-[#fdf9f3] px-3 py-2.5">
              <CalendarDays className="h-4 w-4 shrink-0 text-[#a89e94]" />
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#a89e94]">Membre depuis</p>
                <p className="truncate text-[13px] font-bold text-[#1c1410]">
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
            window.location.href = `/restaurant/${publicId}/order`;
          }}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-full border border-[#dbd7d2] bg-white py-3 text-[13px] font-semibold text-[#68625e] transition-colors active:bg-[#fdf9f3] active:text-[#1c1410]"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>

        <div className="pt-1 text-center">
          <Link
            href={`/restaurant/${publicId}/order`}
            className="text-[12px] text-[#68625e] underline-offset-4 active:text-[#1c1410] hover:underline"
          >
            Retour au menu
          </Link>
        </div>

        <TopupDrawer publicId={publicId} open={topupOpen} onClose={() => setTopupOpen(false)} tiers={topupTiers} />
        <TopupSuccessModal
          open={!!topupSuccessTx}
          transaction={topupSuccessTx}
          onClose={() => setTopupSuccessTx(null)}
        />
      </div>
    </div>
  );
}
