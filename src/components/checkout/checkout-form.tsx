"use client";

import { useState } from "react";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice } from "@/lib/format";
import { Label } from "@/components/ui/label";
import type { AcceptedPaymentMethod, CustomerProfile, OrderType } from "@/lib/types";
import { toast } from "sonner";
import { Loader2, CreditCard, Banknote, Wallet, UtensilsCrossed, ShoppingBag, Bike, Gift, ChevronRight, type LucideIcon } from "lucide-react";
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
  slug,
  stripeConnected,
  acceptedPaymentMethods,
  orderTypes,
  customerProfile,
  walletBalance,
  loyaltyEnabled,
  restaurantCoords,
}: {
  slug: string;
  stripeConnected: boolean;
  acceptedPaymentMethods: AcceptedPaymentMethod[];
  orderTypes: OrderType[];
  customerProfile: CustomerProfile | null;
  walletBalance: number;
  loyaltyEnabled?: boolean;
  restaurantCoords?: { lat: number; lng: number } | null;
}) {
  const items = useCartStore((s) => s.items);
  const totalPrice = useCartStore((s) => s.totalPrice);
  const clearCart = useCartStore((s) => s.clearCart);
  const storedOrderType = useCartStore((s) => s.orderType);
  const setStoredOrderType = useCartStore((s) => s.setOrderType);
  const deliveryAddress = useCartStore((s) => s.deliveryAddress);
  const deliveryFee = useCartStore((s) => s.deliveryFee);
  const deliveryMinOrder = useCartStore((s) => s.deliveryMinOrder);

  const showOnSite = acceptedPaymentMethods.includes("on_site");
  const showOnline = acceptedPaymentMethods.includes("online") && stripeConnected;
  const showWallet = !!customerProfile && walletBalance > 0;

  const defaultMethod: PaymentMethod = showOnSite ? "on_site" : "online";
  const [orderType, setOrderType] = useState<OrderType>(storedOrderType ?? orderTypes[0] ?? "dine_in");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(defaultMethod);
  const [paymentSource, setPaymentSource] = useState<PaymentSource>("direct");
  const [customerEmail, setCustomerEmail] = useState("");
  const [loading, setLoading] = useState(false);

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
      toast.error("Veuillez renseigner un email valide pour recevoir votre reçu");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_slug: slug,
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
          queue_session_id: typeof window !== "undefined" ? localStorage.getItem("queue_session_id") : undefined,
          ...(needsEmail && emailIsValid
            ? { customer_email: customerEmail.trim() }
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
        window.location.href = `/restaurant/${slug}/order-confirmation/${data.order_id}`;
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
  const total = itemsTotal + applicableDeliveryFee;
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
      {/* Order summary — total box matching design */}
      <div className="rounded-2xl border-[1.5px] border-border bg-muted/40 p-4">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          Votre commande
        </p>
        <div className="space-y-1.5">
          {items.map((item) => (
            <div key={item.id} className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="min-w-0">
                <span className="font-mono text-muted-foreground">{item.quantity}×</span>{" "}
                <span className="text-foreground">{item.product_name}</span>
                {item.is_menu && (
                  <span className="ml-1 rounded bg-warning-soft px-1 text-[10px] font-bold text-warning">
                    MENU
                  </span>
                )}
                {item.modifiers.length > 0 && (
                  <span className="ml-1 text-[11px] text-muted-foreground">
                    · {item.modifiers.map((m) => m.modifier_name).join(", ")}
                  </span>
                )}
              </span>
              <span className="shrink-0 font-mono text-[13px] font-medium text-foreground">
                {formatPrice(item.line_total)}
              </span>
            </div>
          ))}
          {orderType === "delivery" && applicableDeliveryFee > 0 && (
            <div className="flex justify-between text-[13px]">
              <span className="text-muted-foreground">Frais de livraison</span>
              <span className="font-mono font-medium text-foreground">
                {formatPrice(applicableDeliveryFee)}
              </span>
            </div>
          )}
        </div>
        <hr className="my-3 border-t border-dashed border-border" />
        <div className="flex items-baseline justify-between text-[15px] font-bold">
          <span>Total</span>
          <span className="font-mono">{formatPrice(total)}</span>
        </div>
      </div>

      {/* Order type */}
      {showOrderTypeSelector && (
        <div>
          <Label className="mb-2.5 block font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
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
                  className={`flex h-12 items-center justify-center gap-2 rounded-xl border-[1.5px] px-3 text-[13px] font-semibold transition-colors ${
                    isActive
                      ? "border-foreground bg-foreground/[0.03]"
                      : "border-border bg-background active:bg-accent"
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
          slug={slug}
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

      {/* Loyalty banner — green soft like the design system */}
      {loyaltyEnabled && (
        customerProfile ? (
          <div className="flex items-center gap-3 rounded-2xl border-[1.5px] border-success/20 bg-success-soft/60 p-3.5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-success text-background">
              <Gift className="h-4 w-4" />
            </div>
            <p className="flex-1 text-[13px]">
              <span className="block text-[13px] font-semibold text-success-strong">
                Cette commande vous rapporte{" "}
                <span className="font-mono">{Math.floor(totalPrice() / 100)} pts</span>
              </span>
              <span className="text-[11px] text-success-strong/75">À ajouter à votre cagnotte fidélité</span>
            </p>
          </div>
        ) : (
          <Link
            href={`/restaurant/${slug}/login`}
            className="flex items-center gap-3 rounded-2xl border-[1.5px] border-success/20 bg-success-soft/60 p-3.5 transition-colors active:bg-success-soft"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-success text-background">
              <Gift className="h-4 w-4" />
            </div>
            <p className="flex-1 text-[13px]">
              <span className="block text-[13px] font-semibold text-success-strong">
                Connectez-vous pour cumuler des points
              </span>
              <span className="text-[11px] text-success-strong/75">+1 pt par tranche de 1 €</span>
            </p>
            <ChevronRight className="h-4 w-4 shrink-0 text-success-strong/70" />
          </Link>
        )
      )}

      {/* Payment method */}
      <div>
        <Label className="mb-2.5 block font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
          Mode de paiement
        </Label>
        <div className="space-y-2">
          {showOnSite && (
            <button
              type="button"
              onClick={() => selectDirect("on_site")}
              className={`flex w-full items-center gap-3 rounded-xl border-[1.5px] px-4 py-3.5 text-left transition-colors ${
                !isWalletSelected && paymentMethod === "on_site"
                  ? "border-foreground bg-foreground/[0.03]"
                  : "border-border bg-background active:bg-accent"
              }`}
            >
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted">
                <Banknote className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold">Sur place</p>
                <p className="text-[11px] text-muted-foreground">CB / espèces · au comptoir</p>
              </div>
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-[2px] ${
                  !isWalletSelected && paymentMethod === "on_site"
                    ? "border-foreground bg-foreground"
                    : "border-border"
                }`}
              >
                {!isWalletSelected && paymentMethod === "on_site" && (
                  <span className="h-2 w-2 rounded-full bg-background" />
                )}
              </span>
            </button>
          )}
          {showOnline && (
            <button
              type="button"
              onClick={() => selectDirect("online")}
              className={`flex w-full items-center gap-3 rounded-xl border-[1.5px] px-4 py-3.5 text-left transition-colors ${
                !isWalletSelected && paymentMethod === "online"
                  ? "border-foreground bg-foreground/[0.03]"
                  : "border-border bg-background active:bg-accent"
              }`}
            >
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted">
                <CreditCard className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold">Carte bancaire</p>
                <p className="text-[11px] text-muted-foreground">Sécurisé par Stripe · Apple/Google Pay</p>
              </div>
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-[2px] ${
                  !isWalletSelected && paymentMethod === "online"
                    ? "border-foreground bg-foreground"
                    : "border-border"
                }`}
              >
                {!isWalletSelected && paymentMethod === "online" && (
                  <span className="h-2 w-2 rounded-full bg-background" />
                )}
              </span>
            </button>
          )}
          {showWallet && (
            <button
              type="button"
              onClick={selectWallet}
              className={`flex w-full items-center gap-3 rounded-xl border-[1.5px] px-4 py-3.5 text-left transition-colors ${
                isWalletSelected
                  ? "border-foreground bg-foreground/[0.03]"
                  : "border-border bg-background active:bg-accent"
              }`}
            >
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-info-soft text-info">
                <Wallet className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold">Solde</p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  Disponible : {formatPrice(walletBalance)}
                </p>
              </div>
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-[2px] ${
                  isWalletSelected
                    ? "border-foreground bg-foreground"
                    : "border-border"
                }`}
              >
                {isWalletSelected && (
                  <span className="h-2 w-2 rounded-full bg-background" />
                )}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Email for guests paying online (receipt + order number) */}
      {needsEmail && (
        <div>
          <Label
            htmlFor="customer-email"
            className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground"
          >
            Email
          </Label>
          <input
            id="customer-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder="vous@email.com"
            className="block h-12 w-full rounded-xl border-[1.5px] border-border bg-background px-4 text-[14px] outline-none transition-colors focus:border-foreground"
          />
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Pour recevoir votre reçu et le numéro de commande.
          </p>
        </div>
      )}

      {/* Partial wallet info */}
      {isWalletSelected && !walletCoversAll && (
        <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-info" />
          <p className="text-[12px] leading-snug">
            Votre solde de{" "}
            <span className="font-mono font-bold">{formatPrice(walletBalance)}</span> sera
            déduit. Reste à payer en ligne :{" "}
            <span className="font-mono font-bold">{formatPrice(remainder)}</span>.
          </p>
        </div>
      )}

      {/* Submit — pill button matching design system */}
      <button
        type="submit"
        disabled={loading || deliveryBlocked || (needsEmail && !emailIsValid)}
        className={`relative flex h-13 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${
          isStripeFlow
            ? "bg-[#635BFF] text-white shadow-lg shadow-[#635BFF]/25 hover:bg-[#5448ff]"
            : "bg-success text-white shadow-lg shadow-emerald-600/20"
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
        <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
          Paiement sécurisé · Stripe
        </p>
      )}
    </form>
  );
}
