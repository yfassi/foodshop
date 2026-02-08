"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PickupTimeSelector } from "./pickup-time-selector";
import { toast } from "sonner";
import { Loader2, CreditCard, Banknote } from "lucide-react";

type PaymentMethod = "online" | "on_site";

export function CheckoutForm({
  slug,
  openTime,
  closeTime,
  stripeConnected,
}: {
  slug: string;
  openTime: string;
  closeTime: string;
  stripeConnected: boolean;
}) {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const totalPrice = useCartStore((s) => s.totalPrice);
  const clearCart = useCartStore((s) => s.clearCart);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("on_site");
  const [loading, setLoading] = useState(false);

  const isFormValid =
    name.trim().length >= 2 &&
    phone.trim().length >= 6 &&
    pickupTime !== "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || loading) return;

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
            modifiers: item.modifiers.map((m) => ({
              modifier_id: m.modifier_id,
              group_id: m.group_id,
            })),
          })),
          customer_info: { name: name.trim(), phone: phone.trim() },
          pickup_time: pickupTime,
          payment_method: paymentMethod,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la commande");
      }

      if (data.url) {
        // Stripe redirect
        window.location.href = data.url;
      } else if (data.order_id) {
        // On-site payment: go to confirmation
        clearCart();
        router.push(`/${slug}/order-confirmation/${data.order_id}`);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de la commande"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Order summary */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Votre commande</h3>
        {items.map((item) => (
          <div key={item.id} className="flex justify-between py-1 text-sm">
            <span>
              {item.quantity}x {item.product_name}
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

      {/* Customer info */}
      <div className="space-y-3">
        <div>
          <Label htmlFor="name" className="text-sm font-medium">
            Prenom / Nom
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ali"
            required
            className="mt-1.5 h-12 text-base"
          />
        </div>

        <div>
          <Label htmlFor="phone" className="text-sm font-medium">
            Telephone
          </Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="06 12 34 56 78"
            required
            className="mt-1.5 h-12 text-base"
          />
        </div>

        <div>
          <Label className="text-sm font-medium">
            Heure de retrait
          </Label>
          <div className="mt-1.5">
            <PickupTimeSelector
              value={pickupTime}
              onChange={setPickupTime}
              openTime={openTime}
              closeTime={closeTime}
            />
          </div>
        </div>
      </div>

      {/* Payment method */}
      <div>
        <Label className="mb-2.5 block text-sm font-medium">
          Mode de paiement
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPaymentMethod("on_site")}
            className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
              paymentMethod === "on_site"
                ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                : "border-border hover:border-primary/50 hover:bg-accent"
            }`}
          >
            <Banknote className="h-4 w-4" />
            Sur place
          </button>
          {stripeConnected ? (
            <button
              type="button"
              onClick={() => setPaymentMethod("online")}
              className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                paymentMethod === "online"
                  ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                  : "border-border hover:border-primary/50 hover:bg-accent"
              }`}
            >
              <CreditCard className="h-4 w-4" />
              En ligne
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground opacity-50"
            >
              <CreditCard className="h-4 w-4" />
              En ligne
            </button>
          )}
        </div>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={!isFormValid || loading}
        className="h-14 w-full rounded-xl text-base font-bold"
        size="lg"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : paymentMethod === "online" ? (
          `Payer en ligne \u2014 ${formatPrice(totalPrice())}`
        ) : (
          `Confirmer la commande \u2014 ${formatPrice(totalPrice())}`
        )}
      </Button>
    </form>
  );
}
