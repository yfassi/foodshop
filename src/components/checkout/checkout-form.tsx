"use client";

import { useState } from "react";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import type { AcceptedPaymentMethod, CustomerProfile, OrderType } from "@/lib/types";
import { toast } from "sonner";
import { Loader2, CreditCard, Banknote, Wallet, UtensilsCrossed, ShoppingBag, MessageSquare, Gift } from "lucide-react";

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
}: {
  slug: string;
  stripeConnected: boolean;
  acceptedPaymentMethods: AcceptedPaymentMethod[];
  orderTypes: OrderType[];
  customerProfile: CustomerProfile | null;
  walletBalance: number;
  loyaltyEnabled?: boolean;
}) {
  const items = useCartStore((s) => s.items);
  const totalPrice = useCartStore((s) => s.totalPrice);
  const clearCart = useCartStore((s) => s.clearCart);

  const showOnSite = acceptedPaymentMethods.includes("on_site");
  const showOnline = acceptedPaymentMethods.includes("online") && stripeConnected;
  const showWallet = !!customerProfile && walletBalance >= totalPrice();

  const defaultMethod: PaymentMethod = showOnSite ? "on_site" : "online";
  const [orderType, setOrderType] = useState<OrderType>(orderTypes[0] ?? "dine_in");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(defaultMethod);
  const [paymentSource, setPaymentSource] = useState<PaymentSource>("direct");
  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState(customerProfile?.full_name ?? "");
  const [orderNotes, setOrderNotes] = useState("");

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
          customer_name: customerName.trim() || undefined,
          order_notes: orderNotes.trim() || undefined,
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
        window.location.href = `/${slug}/order-confirmation/${data.order_id}`;
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de la commande"
      );
    } finally {
      setLoading(false);
    }
  };

  const isWalletSelected = paymentSource === "wallet";

  const buttonLabel = loading
    ? null
    : isWalletSelected
      ? `Payer avec le solde \u2014 ${formatPrice(totalPrice())}`
      : paymentMethod === "online"
        ? `Payer en ligne \u2014 ${formatPrice(totalPrice())}`
        : `Confirmer la commande \u2014 ${formatPrice(totalPrice())}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Order summary */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Votre commande</h3>
        {items.map((item) => (
          <div key={item.id} className="flex justify-between py-1 text-sm">
            <span>
              {item.quantity}x {item.product_name}
              {item.is_menu && (
                <span className="ml-1 text-xs font-semibold text-primary">(Menu)</span>
              )}
              {item.modifiers.length > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({item.modifiers.map((m) => m.modifier_name).join(", ")})
                </span>
              )}
            </span>
            <span className="font-semibold">{formatPrice(item.line_total)}</span>
          </div>
        ))}
        <div className="mt-3 flex justify-between border-t border-border pt-3">
          <span className="font-semibold">Total</span>
          <span className="text-lg font-bold text-primary">{formatPrice(totalPrice())}</span>
        </div>
      </div>

      {/* Customer name */}
      <div>
        <Label htmlFor="customer-name" className="mb-2.5 block text-sm font-medium">
          Votre prénom
        </Label>
        <Input
          id="customer-name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Prénom (optionnel)"
          className="rounded-xl"
          maxLength={50}
        />
      </div>

      {/* Order notes */}
      <div>
        <Label htmlFor="order-notes" className="mb-2.5 flex items-center gap-1.5 text-sm font-medium">
          <MessageSquare className="h-3.5 w-3.5" />
          Instructions spéciales
        </Label>
        <Textarea
          id="order-notes"
          value={orderNotes}
          onChange={(e) => setOrderNotes(e.target.value)}
          placeholder="Allergies, préférences, instructions particulières..."
          className="min-h-[80px] resize-none rounded-xl"
          maxLength={200}
        />
      </div>

      {/* Order type */}
      {showOrderTypeSelector && (
        <div>
          <Label className="mb-2.5 block text-sm font-medium">
            Type de commande
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {orderTypes.includes("dine_in") && (
              <button
                type="button"
                onClick={() => setOrderType("dine_in")}
                className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                  orderType === "dine_in"
                    ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                    : "border-border hover:border-primary/50 hover:bg-accent"
                }`}
              >
                <UtensilsCrossed className="h-4 w-4" />
                Sur place
              </button>
            )}
            {orderTypes.includes("takeaway") && (
              <button
                type="button"
                onClick={() => setOrderType("takeaway")}
                className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                  orderType === "takeaway"
                    ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                    : "border-border hover:border-primary/50 hover:bg-accent"
                }`}
              >
                <ShoppingBag className="h-4 w-4" />
                À emporter
              </button>
            )}
          </div>
        </div>
      )}

      {/* Payment method */}
      <div>
        <Label className="mb-2.5 block text-sm font-medium">
          Mode de paiement
        </Label>
        <div className={`grid gap-2 ${showWallet ? "grid-cols-1" : "grid-cols-2"}`}>
          {showOnSite && (
            <button
              type="button"
              onClick={() => selectDirect("on_site")}
              className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                !isWalletSelected && paymentMethod === "on_site"
                  ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                  : "border-border hover:border-primary/50 hover:bg-accent"
              }`}
            >
              <Banknote className="h-4 w-4" />
              Sur place
            </button>
          )}
          {showOnline && (
            <button
              type="button"
              onClick={() => selectDirect("online")}
              className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                !isWalletSelected && paymentMethod === "online"
                  ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                  : "border-border hover:border-primary/50 hover:bg-accent"
              }`}
            >
              <CreditCard className="h-4 w-4" />
              En ligne
            </button>
          )}
          {showWallet && (
            <button
              type="button"
              onClick={selectWallet}
              className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                isWalletSelected
                  ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                  : "border-border hover:border-primary/50 hover:bg-accent"
              }`}
            >
              <Wallet className="h-4 w-4" />
              Solde ({formatPrice(walletBalance)})
            </button>
          )}
        </div>
      </div>

      {/* Loyalty info */}
      {loyaltyEnabled && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <Gift className="h-5 w-5 shrink-0 text-primary" />
          <p className="text-sm">
            {customerProfile ? (
              <>
                Cette commande vous rapportera{" "}
                <span className="font-semibold text-primary">
                  {Math.floor(totalPrice() / 100)} points
                </span>{" "}
                de fidélité
              </>
            ) : (
              <>
                <span className="font-medium">Connectez-vous</span> pour cumuler
                vos points fidélité à chaque commande
              </>
            )}
          </p>
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        disabled={loading}
        className="h-14 w-full rounded-xl text-base font-bold"
        size="lg"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          buttonLabel
        )}
      </Button>
    </form>
  );
}
