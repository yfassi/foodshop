"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import type { CartItem, CategoryWithProducts, OrderType } from "@/lib/types";
import {
  CustomerPicker,
  type SelectedCustomer,
} from "./counter-order/customer-picker";
import { MenuPicker } from "./counter-order/menu-picker";
import { Loader2, Minus, Plus, Trash2, Wallet, CreditCard, Banknote, MoreHorizontal } from "lucide-react";

type OnSiteMethod = "card" | "cash" | "other";
type PaymentMode = "on_site" | "wallet_full" | "wallet_partial";

interface CounterOrderSheetProps {
  open: boolean;
  onClose: () => void;
  publicId: string;
}

function firstName(full: string): string {
  return (full || "").trim().split(/\s+/)[0] || "Client";
}

export function CounterOrderSheet({
  open,
  onClose,
  publicId,
}: CounterOrderSheetProps) {
  // Customer — by default we treat walk-ins as anonymous "client comptoir"
  const [customer, setCustomer] = useState<SelectedCustomer | null>(null);
  const [isGuest, setIsGuest] = useState(true);
  const [guestName, setGuestName] = useState("");
  const [labelDirty, setLabelDirty] = useState(false);
  const [orderLabel, setOrderLabel] = useState("");
  const [nextCounterLabel, setNextCounterLabel] = useState("");

  // Cart
  const [items, setItems] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>("dine_in");

  // Menu
  const [menu, setMenu] = useState<CategoryWithProducts[]>([]);
  const [allowedTypes, setAllowedTypes] = useState<OrderType[]>([
    "dine_in",
    "takeaway",
  ]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuLayout, setMenuLayout] = useState<"linear" | "category_grid">("linear");

  // Pager / notes
  const [pagerNumber, setPagerNumber] = useState("");
  const [notes, setNotes] = useState("");

  // Payment
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("on_site");
  const [onSiteMethod, setOnSiteMethod] = useState<OnSiteMethod>("card");

  // Submit
  const [submitting, setSubmitting] = useState(false);

  // Reset state when closing
  useEffect(() => {
    if (!open) {
      setCustomer(null);
      setIsGuest(true);
      setGuestName("");
      setLabelDirty(false);
      setOrderLabel("");
      setNextCounterLabel("");
      setItems([]);
      setOrderType("dine_in");
      setPagerNumber("");
      setNotes("");
      setPaymentMode("on_site");
      setOnSiteMethod("card");
    }
  }, [open]);

  // Fetch menu when opening
  useEffect(() => {
    if (!open) return;
    setMenuLoading(true);
    fetch(`/api/admin/menu?restaurant_public_id=${encodeURIComponent(publicId)}`)
      .then((r) => r.json())
      .then((data) => {
        setMenu(data.menu || []);
        const types = (data.order_types as OrderType[]) || [
          "dine_in",
          "takeaway",
        ];
        setAllowedTypes(types);
        if (!types.includes(orderType)) {
          setOrderType(types[0] || "dine_in");
        }
        if (data.next_counter_label) {
          setNextCounterLabel(data.next_counter_label as string);
        }
        setMenuLayout(data.menu_layout === "category_grid" ? "category_grid" : "linear");
      })
      .catch(() => toast.error("Impossible de charger le menu"))
      .finally(() => setMenuLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, publicId]);

  // Auto-fill order label (unless user edited it manually)
  useEffect(() => {
    if (labelDirty) return;
    if (customer) {
      setOrderLabel(`CPT_${firstName(customer.full_name)}`);
    } else if (isGuest && guestName.trim()) {
      setOrderLabel(`CPT_${firstName(guestName)}`);
    } else if (isGuest && nextCounterLabel) {
      setOrderLabel(nextCounterLabel);
    } else {
      setOrderLabel("");
    }
  }, [customer, isGuest, guestName, labelDirty, nextCounterLabel]);

  const totalPrice = useMemo(
    () => items.reduce((s, i) => s + i.line_total, 0),
    [items]
  );

  const balance = customer?.balance ?? 0;
  const hasWallet = !!customer && balance > 0;

  // If user picks wallet but it would not cover the total, force partial
  const effectivePaymentMode: PaymentMode = useMemo(() => {
    if (paymentMode === "on_site") return "on_site";
    if (!hasWallet) return "on_site";
    if (balance >= totalPrice) return "wallet_full";
    return "wallet_partial";
  }, [paymentMode, hasWallet, balance, totalPrice]);

  const remainder =
    effectivePaymentMode === "wallet_partial"
      ? Math.max(0, totalPrice - balance)
      : effectivePaymentMode === "on_site"
      ? totalPrice
      : 0;

  const customerReady = !!customer || isGuest;
  const labelReady = orderLabel.trim().length > 0;
  const canSubmit =
    customerReady && labelReady && items.length > 0 && !submitting;

  const handleQuantity = (id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) => {
          if (i.id !== id) return i;
          const q = i.quantity + delta;
          if (q <= 0) return null;
          const unit = i.line_total / i.quantity;
          return { ...i, quantity: q, line_total: unit * q };
        })
        .filter((i): i is CartItem => i !== null)
    );
  };

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);

    type PaymentBody =
      | { mode: "on_site"; method: OnSiteMethod }
      | { mode: "wallet_full" }
      | { mode: "wallet_partial"; on_site_method: OnSiteMethod };

    const payment: PaymentBody =
      effectivePaymentMode === "on_site"
        ? { mode: "on_site", method: onSiteMethod }
        : effectivePaymentMode === "wallet_full"
        ? { mode: "wallet_full" }
        : { mode: "wallet_partial", on_site_method: onSiteMethod };

    const body = {
      restaurant_public_id: publicId,
      items: items.map((i) => ({
        product_id: i.product_id,
        product_name: i.product_name,
        quantity: i.quantity,
        is_menu: i.is_menu,
        modifiers: i.modifiers.map((m) => ({
          modifier_id: m.modifier_id,
          group_id: m.group_id,
        })),
      })),
      order_type: orderType,
      customer_user_id: customer?.user_id || undefined,
      customer_label: orderLabel.trim(),
      pager_number: pagerNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      payment,
    };

    try {
      const res = await fetch("/api/admin/orders/counter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur");
      }
      toast.success(
        `Commande ${data.display_order_number} envoyée en cuisine`
      );
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de l'envoi"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[95vh]">
        <DrawerHeader className="px-4 pb-2 pt-3">
          <DrawerTitle>Nouvelle commande comptoir</DrawerTitle>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {/* === Customer === */}
          <section className="mb-5">
            <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Client
            </Label>
            <CustomerPicker
              publicId={publicId}
              selected={customer}
              onSelect={(c) => {
                setCustomer(c);
                if (c) {
                  setIsGuest(false);
                  setGuestName("");
                  setLabelDirty(false);
                  if (paymentMode !== "on_site" && (!c.balance || c.balance <= 0)) {
                    setPaymentMode("on_site");
                  }
                } else {
                  setPaymentMode("on_site");
                }
              }}
              guestName={guestName}
              onGuestNameChange={(v) => {
                setGuestName(v);
                setLabelDirty(false);
              }}
              isGuest={isGuest}
              onGuestModeChange={(g) => {
                setIsGuest(g);
                if (g) {
                  setCustomer(null);
                  setPaymentMode("on_site");
                }
              }}
            />
          </section>

          {/* === Order label & type === */}
          <section className="mb-5 grid gap-3 sm:grid-cols-2">
            <div>
              <Label
                htmlFor="order-label"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Nom de la commande
              </Label>
              <Input
                id="order-label"
                value={orderLabel}
                onChange={(e) => {
                  setOrderLabel(e.target.value);
                  setLabelDirty(true);
                }}
                placeholder="CPT_Jean"
              />
            </div>
            {allowedTypes.length > 1 && (
              <div>
                <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Type
                </Label>
                <div className="flex h-9 items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
                  {allowedTypes.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setOrderType(t)}
                      className={`flex-1 rounded-md px-3 text-xs font-medium transition-colors ${
                        orderType === t
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t === "dine_in"
                        ? "Sur place"
                        : t === "takeaway"
                        ? "À emporter"
                        : "Livraison"}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* === Articles === */}
          <section className="mb-5">
            <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Articles
            </Label>

            {/* Cart summary */}
            {items.length > 0 && (
              <div className="mb-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {items.map((i) => (
                  <div key={i.id} className="flex items-center gap-2 p-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {i.product_name}
                        {i.is_menu && (
                          <span className="ml-1 text-xs font-semibold text-primary">
                            (Menu)
                          </span>
                        )}
                      </p>
                      {i.modifiers.length > 0 && (
                        <p className="truncate text-[11px] text-muted-foreground">
                          {i.modifiers.map((m) => m.modifier_name).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 rounded-lg bg-muted">
                      <button
                        type="button"
                        onClick={() => handleQuantity(i.id, -1)}
                        className="flex h-7 w-7 items-center justify-center"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-5 text-center text-sm font-bold">
                        {i.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuantity(i.id, +1)}
                        className="flex h-7 w-7 items-center justify-center"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="w-16 text-right text-sm font-semibold">
                      {formatPrice(i.line_total)}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleRemove(i.id)}
                      className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-destructive"
                      aria-label="Retirer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {menuLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <MenuPicker
                categories={menu}
                onAddItem={(it) => setItems((prev) => [...prev, it])}
                menuLayout={menuLayout}
              />
            )}
          </section>

          {/* === Pager & notes === */}
          <section className="mb-5 grid gap-3 sm:grid-cols-2">
            <div>
              <Label
                htmlFor="pager"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                N° de bipper
              </Label>
              <Input
                id="pager"
                value={pagerNumber}
                onChange={(e) => setPagerNumber(e.target.value)}
                placeholder="Ex: 12"
                maxLength={20}
              />
            </div>
            <div>
              <Label
                htmlFor="notes"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Notes (optionnel)
              </Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Sans oignon…"
                maxLength={500}
              />
            </div>
          </section>

          {/* === Payment === */}
          <section className="mb-2">
            <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Paiement
            </Label>
            <div className="space-y-2">
              {hasWallet && (
                <button
                  type="button"
                  onClick={() => setPaymentMode("wallet_full")}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                    paymentMode !== "on_site"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-foreground/30"
                  }`}
                >
                  <Wallet className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Cagnotte</p>
                    <p className="text-xs text-muted-foreground">
                      Solde&nbsp;: {formatPrice(balance)}
                      {totalPrice > 0 && balance < totalPrice && (
                        <span className="ml-2 font-medium text-destructive">
                          Reste {formatPrice(totalPrice - balance)} à encaisser
                        </span>
                      )}
                      {totalPrice > 0 && balance >= totalPrice && (
                        <span className="ml-2 text-foreground">
                          (reste {formatPrice(balance - totalPrice)} après)
                        </span>
                      )}
                    </p>
                  </div>
                </button>
              )}

              {(paymentMode === "on_site" ||
                effectivePaymentMode === "wallet_partial") && (
                <div
                  className={`rounded-xl border p-3 ${
                    paymentMode === "on_site"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setPaymentMode("on_site")}
                    className="mb-2 flex w-full items-center gap-3 text-left"
                  >
                    <Banknote className="h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {effectivePaymentMode === "wallet_partial"
                          ? `Complément à encaisser : ${formatPrice(remainder)}`
                          : "Paiement au comptoir"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        CB, espèces ou autre
                      </p>
                    </div>
                  </button>
                  <div className="mt-1 grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { v: "card" as const, label: "CB", Icon: CreditCard },
                        { v: "cash" as const, label: "Espèces", Icon: Banknote },
                        {
                          v: "other" as const,
                          label: "Autre",
                          Icon: MoreHorizontal,
                        },
                      ] satisfies {
                        v: OnSiteMethod;
                        label: string;
                        Icon: React.ComponentType<{ className?: string }>;
                      }[]
                    ).map(({ v, label, Icon }) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setOnSiteMethod(v)}
                        className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors ${
                          onSiteMethod === v
                            ? "border-foreground bg-foreground/[0.04] text-foreground"
                            : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        <DrawerFooter className="border-t border-border px-4 pt-3">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-2xl font-bold">{formatPrice(totalPrice)}</span>
          </div>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="h-12 w-full rounded-xl text-sm font-semibold"
            size="lg"
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Envoyer en cuisine
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
