"use client";

import { useState } from "react";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice } from "@/lib/format";
import { Label } from "@/components/ui/label";
import type { AcceptedPaymentMethod, CartItem, CustomerProfile, LoyaltyTier, OrderType } from "@/lib/types";
import { toast } from "sonner";
import { Loader2, CreditCard, Banknote, Wallet, UtensilsCrossed, ShoppingBag, Bike, Gift, Sparkles, Check, FlaskConical, ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { DeliveryAddressPicker } from "./delivery-address-picker";

const ORDER_TYPE_CONFIG: Record<OrderType, { label: string; icon: LucideIcon }> = {
  dine_in: { label: "Sur place", icon: UtensilsCrossed },
  takeaway: { label: "À emporter", icon: ShoppingBag },
  delivery: { label: "Livraison", icon: Bike },
};

type PaymentMethod = "online" | "on_site";
type PaymentSource = "direct" | "wallet";

export function CheckoutForm({
  publicId,
  stripeConnected,
  acceptedPaymentMethods,
  orderTypes,
  customerProfile,
  walletBalance,
  loyaltyEnabled,
  loyaltyTiers = [],
  totalPoints = 0,
  restaurantCoords,
  isDemo = false,
  defaultEmail,
}: {
  publicId: string;
  stripeConnected: boolean;
  acceptedPaymentMethods: AcceptedPaymentMethod[];
  orderTypes: OrderType[];
  customerProfile: CustomerProfile | null;
  walletBalance: number;
  loyaltyEnabled?: boolean;
  loyaltyTiers?: LoyaltyTier[];
  totalPoints?: number;
  restaurantCoords?: { lat: number; lng: number } | null;
  isDemo?: boolean;
  defaultEmail?: string;
}) {
  const items = useCartStore((s) => s.items);
  const totalPrice = useCartStore((s) => s.totalPrice);
  const clearCart = useCartStore((s) => s.clearCart);
  const addCartItem = useCartStore((s) => s.addItem);
  const removeCartItem = useCartStore((s) => s.removeItem);
  const setCartRestaurantPublicId = useCartStore((s) => s.setRestaurantPublicId);
  const storedOrderType = useCartStore((s) => s.orderType);
  const setStoredOrderType = useCartStore((s) => s.setOrderType);
  const deliveryAddress = useCartStore((s) => s.deliveryAddress);
  const deliveryFee = useCartStore((s) => s.deliveryFee);
  const deliveryMinOrder = useCartStore((s) => s.deliveryMinOrder);
  const loyaltyReward = useCartStore((s) => s.loyaltyReward);
  const setLoyaltyReward = useCartStore((s) => s.setLoyaltyReward);

  const showOnSite = acceptedPaymentMethods.includes("on_site");
  const showOnline = acceptedPaymentMethods.includes("online") && stripeConnected;
  const showWallet = !!customerProfile && walletBalance > 0;

  const defaultMethod: PaymentMethod = showOnSite ? "on_site" : "online";
  const [orderType, setOrderType] = useState<OrderType>(storedOrderType ?? orderTypes[0] ?? "dine_in");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(defaultMethod);
  const [paymentSource, setPaymentSource] = useState<PaymentSource>("direct");
  const [customerEmail, setCustomerEmail] = useState<string>(defaultEmail ?? "");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateEmail = (raw: string) => {
    const v = raw.trim();
    if (!v) return null; // optionnel
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Email invalide";
    return null;
  };

  const needsEmail = !customerProfile && paymentMethod === "online" && paymentSource === "direct";
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim());

  const showOrderTypeSelector = orderTypes.length > 1;

  const selectWallet = () => {
    setPaymentSource("wallet");
    setPaymentMethod("online");
  };

  const selectDirect = (method: PaymentMethod) => {
    setPaymentSource("direct");
    setPaymentMethod(method);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (orderType === "delivery") {
      if (!deliveryAddress) {
        toast.error("Veuillez renseigner une adresse de livraison");
        return;
      }
      if (deliveryMinOrder > 0 && totalPrice() < deliveryMinOrder) {
        toast.error(
          `Minimum de commande pour cette zone : ${formatPrice(deliveryMinOrder)}`
        );
        return;
      }
    }

    if (needsEmail && !emailIsValid) {
      const msg = "Veuillez renseigner un email valide pour recevoir votre reçu";
      setEmailError(msg);
      toast.error(msg);
      return;
    }
    const emailValidation = validateEmail(customerEmail);
    if (emailValidation) {
      setEmailError(emailValidation);
      toast.error(emailValidation);
      return;
    }
    setEmailError(null);

    setLoading(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_public_id: publicId,
          items: items.map((item) => ({
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            is_menu: item.is_menu,
            modifiers: item.modifiers.map((m) => ({
              modifier_id: m.modifier_id,
              group_id: m.group_id,
            })),
          })),
          order_type: orderType,
          payment_method: paymentMethod,
          payment_source: paymentSource,
          customer_email: customerEmail.trim() || undefined,
          queue_session_id: typeof window !== "undefined" ? localStorage.getItem("queue_session_id") : undefined,
          ...(activeReward
            ? { loyalty_reward: { tier_id: activeReward.tier_id } }
            : {}),
          ...(orderType === "delivery" && deliveryAddress
            ? { delivery_address: deliveryAddress }
            : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la commande");
      }

      if (data.url) {
        window.location.href = data.url;
      } else if (data.order_id) {
        clearCart();
        window.location.href = `/restaurant/${publicId}/order-confirmation/${data.order_id}`;
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de la commande"
      );
    } finally {
      setLoading(false);
    }
  };

  const itemsTotal = totalPrice();
  const applicableDeliveryFee = orderType === "delivery" ? deliveryFee : 0;
  const grossTotal = itemsTotal + applicableDeliveryFee;
  // Loyalty discount: only apply if the cached tier is still eligible.
  const activeReward =
    loyaltyReward &&
    customerProfile &&
    totalPoints >= loyaltyReward.points &&
    loyaltyTiers.some(
      (t) => t.id === loyaltyReward.tier_id && t.reward_type === "discount"
    )
      ? loyaltyReward
      : null;
  const discountApplied = activeReward
    ? Math.min(activeReward.discount_amount, grossTotal)
    : 0;
  const total = Math.max(0, grossTotal - discountApplied);
  const isWalletSelected = paymentSource === "wallet";
  const walletCoversAll = walletBalance >= total;
  const remainder = total - walletBalance;
  const deliveryBlocked =
    orderType === "delivery" &&
    (!deliveryAddress ||
      (deliveryMinOrder > 0 && itemsTotal < deliveryMinOrder));

  const buttonLabel = loading
    ? null
    : isWalletSelected
      ? walletCoversAll
        ? `Payer avec le solde · ${formatPrice(total)}`
        : `Payer ${formatPrice(remainder)} en ligne`
      : paymentMethod === "online"
        ? `Payer en ligne · ${formatPrice(total)}`
        : `Confirmer la commande · ${formatPrice(total)}`;

  const isStripeFlow = !isWalletSelected && paymentMethod === "online";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Order summary — kit: ticket-paper style, dashed dividers, Space Mono */}
      <div className="rounded-[14px] border-[1.5px] border-[#dbd7d2] bg-white p-4">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#68625e]">
          Votre commande
        </p>
        <div className="space-y-1.5">
          {items.map((item) => (
            <div key={item.id} className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="min-w-0">
                <span className="font-mono text-[#a89e94]">{item.quantity}×</span>{" "}
                <span className="text-[#1c1410]">{item.product_name}</span>
                {item.is_menu && (
                  <span className="ml-1 rounded-full bg-[#fdebc8] px-1.5 text-[10px] font-bold text-[#b75000]">
                    MENU
                  </span>
                )}
                {item.modifiers.length > 0 && (
                  <span className="ml-1 text-[11px] text-[#68625e]">
                    · {item.modifiers.map((m) => m.modifier_name).join(", ")}
                  </span>
                )}
              </span>
              <span className="shrink-0 font-mono text-[13px] font-medium text-[#1c1410]">
                {formatPrice(item.line_total)}
              </span>
            </div>
          ))}
          {orderType === "delivery" && applicableDeliveryFee > 0 && (
            <div className="flex justify-between text-[13px]">
              <span className="text-[#68625e]">Frais de livraison</span>
              <span className="font-mono font-medium text-[#1c1410]">
                {formatPrice(applicableDeliveryFee)}
              </span>
            </div>
          )}
          {discountApplied > 0 && (
            <div className="flex justify-between text-[13px]">
              <span className="text-[#d7352d]">
                Bonus fidélité · {activeReward?.label ?? "Réduction"}
              </span>
              <span className="font-mono font-medium text-[#d7352d]">
                −{formatPrice(discountApplied)}
              </span>
            </div>
          )}
        </div>
        {/* Dashed divider */}
        <div
          className="my-3"
          style={{
            height: 1,
            background: "repeating-linear-gradient(to right, #dbd7d2 0, #dbd7d2 4px, transparent 4px, transparent 8px)",
          }}
        />
        <div className="flex items-baseline justify-between text-[15px] font-extrabold text-[#1c1410]">
          <span>Total</span>
          <span className="font-mono">{formatPrice(total)}</span>
        </div>
      </div>

      {/* Order type */}
      {showOrderTypeSelector && (
        <div>
          <Label className="mb-2.5 block font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#68625e]">
            Type de commande
          </Label>
          <div
            className={`grid gap-2 ${
              orderTypes.length === 3 ? "grid-cols-3" : "grid-cols-2"
            }`}
          >
            {orderTypes.map((type) => {
              const config = ORDER_TYPE_CONFIG[type];
              if (!config) return null;
              const Icon = config.icon;
              const isActive = orderType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setOrderType(type);
                    setStoredOrderType(type);
                  }}
                  className={`flex h-12 items-center justify-center gap-2 rounded-[12px] border-[1.5px] px-3 text-[13px] font-semibold transition-colors ${
                    isActive
                      ? "border-[#1c1410] bg-[#fdf9f3] text-[#1c1410]"
                      : "border-[#dbd7d2] bg-white text-[#68625e] active:bg-[#fdf9f3]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {orderType === "delivery" && (
        <DeliveryAddressPicker
          publicId={publicId}
          restaurantCoords={restaurantCoords}
        />
      )}

      {deliveryBlocked && deliveryAddress && deliveryMinOrder > 0 && itemsTotal < deliveryMinOrder && (
        <p className="rounded-xl bg-warning-soft p-3 text-[12px] text-warning">
          Minimum de commande pour cette zone :{" "}
          <span className="font-mono font-bold">{formatPrice(deliveryMinOrder)}</span>.
          Ajoutez {formatPrice(deliveryMinOrder - itemsTotal)} pour valider.
        </p>
      )}

      {/* Loyalty — kit: tomato red border + claimable bonuses */}
      {loyaltyEnabled && (
        <LoyaltySection
          customerProfile={customerProfile}
          totalPoints={totalPoints}
          earningPoints={Math.floor(total / 100)}
          tiers={loyaltyTiers}
          items={items}
          activeRewardTierId={activeReward?.tier_id ?? null}
          publicId={publicId}
          onClaim={(tier) => {
            if (tier.reward_type === "discount") {
              if (!tier.discount_amount || tier.discount_amount <= 0) return;
              if (loyaltyReward?.tier_id === tier.id) {
                setLoyaltyReward(null);
                toast(`${tier.label || "Réduction"} retirée`);
                return;
              }
              setCartRestaurantPublicId(publicId);
              setLoyaltyReward({
                tier_id: tier.id,
                points: tier.points,
                discount_amount: tier.discount_amount,
                label:
                  tier.label ||
                  `${(tier.discount_amount / 100).toFixed(2)} € offerts`,
              });
              toast.success(`${tier.label || "Réduction"} appliquée à votre commande`);
              return;
            }

            if (tier.reward_type === "free_product" && tier.product_id) {
              const productName = tier.product_name ?? tier.label ?? "Article offert";
              const existing = items.find(
                (it) => it.product_id === tier.product_id && it.base_price === 0
              );
              if (existing) {
                removeCartItem(existing.id);
                toast(`${productName} retiré de votre panier`);
                return;
              }
              setCartRestaurantPublicId(publicId);
              addCartItem({
                product_id: tier.product_id,
                product_name: `🎁 ${productName} (offert)`,
                base_price: 0,
                quantity: 1,
                modifiers: [],
                is_menu: false,
                menu_supplement: 0,
              });
              toast.success(`${productName} ajouté gratuitement à votre commande`);
            }
          }}
        />
      )}

      {/* Email — only ask if we don't already have one for the receipt */}
      {!defaultEmail && (
        <div>
          <Label
            htmlFor="customer_email"
            className="mb-2.5 block font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground"
          >
            Email <span className="text-muted-foreground/60">(optionnel · reçu par mail)</span>
          </Label>
          <input
            id="customer_email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="vous@exemple.fr"
            value={customerEmail}
            onChange={(e) => {
              setCustomerEmail(e.target.value);
              if (emailError) setEmailError(null);
            }}
            onBlur={() => setEmailError(validateEmail(customerEmail))}
            className={`flex h-12 w-full rounded-xl border-[1.5px] bg-background px-4 text-[14px] outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground ${
              emailError ? "border-destructive" : "border-border"
            }`}
          />
          {emailError && (
            <p className="mt-1.5 text-[11px] text-destructive">{emailError}</p>
          )}
        </div>
      )}

      {/* Payment method */}
      <div>
        <Label className="mb-2.5 block font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#68625e]">
          Mode de paiement
        </Label>
        <div className="space-y-2">
          {showOnSite && (
            <button
              type="button"
              onClick={() => selectDirect("on_site")}
              className={`flex w-full items-center gap-3 rounded-[12px] border-[1.5px] px-4 py-3.5 text-left transition-colors ${
                !isWalletSelected && paymentMethod === "on_site"
                  ? "border-[#1c1410] bg-[#fdf9f3]"
                  : "border-[#dbd7d2] bg-white active:bg-[#fdf9f3]"
              }`}
            >
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#f0ebe1] text-[#68625e]">
                <Banknote className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-bold text-[#1c1410]">Sur place</p>
                <p className="text-[11px] text-[#68625e]">CB / espèces · au comptoir</p>
              </div>
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-[2px] ${
                  !isWalletSelected && paymentMethod === "on_site"
                    ? "border-[#d7352d] bg-[#d7352d]"
                    : "border-[#dbd7d2]"
                }`}
              >
                {!isWalletSelected && paymentMethod === "on_site" && (
                  <span className="h-2 w-2 rounded-full bg-white" />
                )}
              </span>
            </button>
          )}
          {showOnline && (
            <button
              type="button"
              onClick={() => selectDirect("online")}
              className={`flex w-full items-center gap-3 rounded-[12px] border-[1.5px] px-4 py-3.5 text-left transition-colors ${
                !isWalletSelected && paymentMethod === "online"
                  ? "border-[#1c1410] bg-[#fdf9f3]"
                  : "border-[#dbd7d2] bg-white active:bg-[#fdf9f3]"
              }`}
            >
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#f0ebe1] text-[#68625e]">
                <CreditCard className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-bold text-[#1c1410]">Carte bancaire</p>
                <p className="text-[11px] text-[#68625e]">Sécurisé par Stripe · Apple/Google Pay</p>
              </div>
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-[2px] ${
                  !isWalletSelected && paymentMethod === "online"
                    ? "border-[#d7352d] bg-[#d7352d]"
                    : "border-[#dbd7d2]"
                }`}
              >
                {!isWalletSelected && paymentMethod === "online" && (
                  <span className="h-2 w-2 rounded-full bg-white" />
                )}
              </span>
            </button>
          )}
          {showWallet && (
            <button
              type="button"
              onClick={selectWallet}
              className={`flex w-full items-center gap-3 rounded-[12px] border-[1.5px] px-4 py-3.5 text-left transition-colors ${
                isWalletSelected
                  ? "border-[#1c1410] bg-[#fdf9f3]"
                  : "border-[#dbd7d2] bg-white active:bg-[#fdf9f3]"
              }`}
            >
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#d8e3f4] text-[#172846]">
                <Wallet className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-bold text-[#1c1410]">Solde</p>
                <p className="font-mono text-[11px] text-[#68625e]">
                  Disponible : {formatPrice(walletBalance)}
                </p>
              </div>
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-[2px] ${
                  isWalletSelected
                    ? "border-[#d7352d] bg-[#d7352d]"
                    : "border-[#dbd7d2]"
                }`}
              >
                {isWalletSelected && (
                  <span className="h-2 w-2 rounded-full bg-white" />
                )}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Partial wallet info */}
      {isWalletSelected && !walletCoversAll && (
        <div className="flex items-start gap-3 rounded-[12px] border border-[#d8e3f4] bg-[#d8e3f4]/40 px-4 py-3">
          <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-[#172846]" />
          <p className="text-[12px] leading-snug text-[#1c1410]">
            Votre solde de{" "}
            <span className="font-mono font-bold">{formatPrice(walletBalance)}</span> sera
            déduit. Reste à payer en ligne :{" "}
            <span className="font-mono font-bold">{formatPrice(remainder)}</span>.
          </p>
        </div>
      )}

      {/* Submit — kit: tomato red primary pill (or Stripe purple for card flow) */}
      <button
        type="submit"
        disabled={loading || deliveryBlocked || (needsEmail && !emailIsValid)}
        className={`relative flex w-full items-center justify-center gap-2 rounded-full text-[14px] font-bold uppercase tracking-[0.06em] transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${
          isStripeFlow
            ? "bg-[#635BFF] text-white shadow-lg shadow-[#635BFF]/25"
            : "bg-[#d7352d] text-white shadow-[0_0_20px_#d7352d4d]"
        }`}
        style={{ height: 52 }}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            {isStripeFlow && (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
              </svg>
            )}
            {buttonLabel}
          </>
        )}
      </button>
      {isStripeFlow && (
        <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-[#a89e94]">
          Paiement sécurisé · Stripe
        </p>
      )}
      {isDemo && isStripeFlow && (
        <p className="mt-1 inline-flex w-full items-center justify-center gap-1 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-amber-700">
          <FlaskConical className="h-3 w-3" />
          Mode démo · carte test 4242 4242 4242 4242
        </p>
      )}
    </form>
  );
}

function LoyaltySection({
  customerProfile,
  totalPoints,
  earningPoints,
  tiers,
  items,
  activeRewardTierId,
  publicId,
  onClaim,
}: {
  customerProfile: CustomerProfile | null;
  totalPoints: number;
  earningPoints: number;
  tiers: LoyaltyTier[];
  items: CartItem[];
  activeRewardTierId: string | null;
  publicId: string;
  onClaim: (tier: LoyaltyTier) => void;
}) {
  if (!customerProfile) {
    return (
      <Link
        href={`/restaurant/${publicId}/login`}
        className="flex items-center gap-3 rounded-[14px] border-[1.5px] border-[#dbd7d2] bg-white p-3.5 transition-colors active:bg-[#fdf9f3]"
      >
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#008138] text-white">
          <Gift className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="text-[13px] font-bold text-[#1c1410]">
            Connectez-vous pour cumuler des points
          </p>
          <p className="text-[11px] text-[#68625e]">+1 pt par tranche de 1 €</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-[#a89e94]" />
      </Link>
    );
  }

  const sortedTiers = [...tiers].sort((a, b) => a.points - b.points);
  const unlocked = sortedTiers.filter((t) => totalPoints >= t.points);
  const claimableTiers = unlocked.filter(
    (t) =>
      (t.reward_type === "free_product" && !!t.product_id) ||
      (t.reward_type === "discount" && !!t.discount_amount && t.discount_amount > 0)
  );
  const nextTier = sortedTiers.find((t) => t.points > totalPoints);

  const isClaimed = (tier: LoyaltyTier) => {
    if (tier.reward_type === "free_product" && tier.product_id) {
      return items.some(
        (it) => it.product_id === tier.product_id && it.base_price === 0
      );
    }
    if (tier.reward_type === "discount") {
      return activeRewardTierId === tier.id;
    }
    return false;
  };

  return (
    <div className="space-y-2.5">
      {/* Points header */}
      <div className="flex items-center gap-3 rounded-[14px] border-[1.5px] border-[#d7352d] bg-[#fdf9f3] p-3.5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#d7352d] text-white">
          <Gift className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="text-[13px] font-bold text-[#1c1410]">
            Vous avez <span className="font-mono">{totalPoints} pts</span>
            {nextTier && (
              <span className="font-normal text-[#68625e]">
                {" "}
                · encore {nextTier.points - totalPoints} pts pour{" "}
                {nextTier.label || nextTier.product_name || "votre récompense"}
              </span>
            )}
          </p>
          <p className="text-[11px] text-[#68625e]">
            Cette commande vous rapportera{" "}
            <span className="font-mono font-semibold">+{earningPoints} pts</span>
          </p>
        </div>
      </div>

      {/* Claimable bonuses */}
      {claimableTiers.length > 0 && (
        <div className="rounded-[14px] border-[1.5px] border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-3">
          <p className="mb-2 inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700">
            <Sparkles className="h-3 w-3" />
            {claimableTiers.length > 1
              ? `${claimableTiers.length} bonus disponibles`
              : "1 bonus disponible"}
          </p>
          <div className="space-y-1.5">
            {claimableTiers.map((tier) => {
              const claimed = isClaimed(tier);
              const title =
                tier.label || tier.product_name || "Article offert";
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => onClaim(tier)}
                  className={`flex w-full items-center gap-2.5 rounded-[12px] border-[1.5px] px-3 py-2.5 text-left transition-colors active:scale-[0.99] ${
                    claimed
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-amber-200 bg-white"
                  }`}
                >
                  <div
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                      claimed
                        ? "bg-emerald-500 text-white"
                        : "bg-gradient-to-br from-amber-400 to-orange-500 text-white"
                    }`}
                  >
                    {claimed ? (
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    ) : (
                      <Gift className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-[#1c1410]">
                      {title}
                    </p>
                    <p className="text-[11px] text-[#68625e]">
                      {claimed
                        ? "Ajouté · touchez pour retirer"
                        : `${tier.points} pts · activer le bonus`}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      claimed
                        ? "bg-emerald-500 text-white"
                        : "bg-[#1c1410] text-white"
                    }`}
                  >
                    {claimed ? "Activé" : "Activer"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
