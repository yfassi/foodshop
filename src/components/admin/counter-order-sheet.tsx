"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatPrice } from "@/lib/format";
import type { CartItem, CategoryWithProducts, OrderType } from "@/lib/types";
import {
  CustomerPicker,
  type SelectedCustomer,
} from "./counter-order/customer-picker";
import { MenuPicker } from "./counter-order/menu-picker";
import {
  Loader2,
  Minus,
  Plus,
  Trash2,
  Wallet,
  CreditCard,
  Banknote,
  MoreHorizontal,
  X,
  ChevronDown,
  User as UserIcon,
} from "lucide-react";

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

  // Compact customer popover open/close
  const [customerOpen, setCustomerOpen] = useState(false);

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

  const customerLabel = customer
    ? customer.full_name
    : isGuest
    ? guestName.trim() || "Client comptoir"
    : "Client comptoir";

  const orderTypeLabels: Record<OrderType, string> = {
    dine_in: "Sur place",
    takeaway: "À emporter",
    delivery: "Livraison",
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="!mt-0 h-[100dvh] !max-h-[100dvh] !rounded-none [&>div:first-child]:hidden">
        <DrawerTitle className="sr-only">Nouvelle commande comptoir</DrawerTitle>

        {/* === Compact header === */}
        <header className="flex items-center gap-2 border-b border-border bg-background px-3 py-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Customer pill */}
          <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex h-9 min-w-0 max-w-[14rem] items-center gap-2 rounded-full border border-border bg-card px-3 text-sm font-medium transition-colors hover:border-foreground/40"
              >
                <UserIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{customerLabel}</span>
                {customer && balance > 0 && (
                  <span className="ml-0.5 shrink-0 rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
                    {formatPrice(balance)}
                  </span>
                )}
                <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-3">
              <CustomerPicker
                publicId={publicId}
                selected={customer}
                onSelect={(c) => {
                  setCustomer(c);
                  if (c) {
                    setIsGuest(false);
                    setGuestName("");
                    setLabelDirty(false);
                    if (
                      paymentMode !== "on_site" &&
                      (!c.balance || c.balance <= 0)
                    ) {
                      setPaymentMode("on_site");
                    }
                    setCustomerOpen(false);
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
                    setCustomerOpen(false);
                  }
                }}
              />
            </PopoverContent>
          </Popover>

          {/* Order type pills */}
          {allowedTypes.length > 1 && (
            <div className="flex h-9 items-center gap-0.5 rounded-full border border-border bg-muted/40 p-0.5">
              {allowedTypes.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setOrderType(t)}
                  className={`h-full rounded-full px-3 text-xs font-medium transition-colors ${
                    orderType === t
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {orderTypeLabels[t]}
                </button>
              ))}
            </div>
          )}

          {/* Order label */}
          <Input
            value={orderLabel}
            onChange={(e) => {
              setOrderLabel(e.target.value);
              setLabelDirty(true);
            }}
            placeholder="CPT_001"
            className="h-9 w-32 text-sm"
            aria-label="Nom de la commande"
          />

          {/* Pager */}
          <Input
            value={pagerNumber}
            onChange={(e) => setPagerNumber(e.target.value)}
            placeholder="Bipper"
            maxLength={20}
            className="h-9 w-24 text-sm"
            aria-label="Numéro de bipper"
          />

          {/* Notes */}
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes…"
            maxLength={500}
            className="hidden h-9 flex-1 text-sm md:block"
            aria-label="Notes"
          />
        </header>

        {/* === Main: split between menu picker and cart === */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Menu picker — dominant area */}
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
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
          </div>

          {/* Cart side panel — desktop/tablet only */}
          <aside className="hidden w-[22rem] shrink-0 flex-col border-l border-border bg-muted/20 md:flex">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Panier
              </p>
              <span className="font-mono text-xs font-semibold text-muted-foreground">
                {items.reduce((s, i) => s + i.quantity, 0)}
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <p className="p-6 text-center text-xs text-muted-foreground">
                  Cliquez sur un article pour l&apos;ajouter.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {items.map((i) => (
                    <div key={i.id} className="flex items-center gap-2 px-3 py-2.5">
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
                      <p className="w-14 text-right text-sm font-semibold tabular-nums">
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
            </div>
          </aside>
        </div>

        {/* === Bottom bar: cart (mobile), payment, total, send === */}
        <footer className="border-t border-border bg-background">
          {/* Mobile cart preview (hidden on md+) */}
          {items.length > 0 && (
            <div className="max-h-40 overflow-y-auto border-b border-border md:hidden">
              <div className="divide-y divide-border">
                {items.map((i) => (
                  <div key={i.id} className="flex items-center gap-2 px-3 py-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-medium">
                      {i.product_name}
                    </p>
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
                    <p className="w-14 text-right text-sm font-semibold tabular-nums">
                      {formatPrice(i.line_total)}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleRemove(i.id)}
                      className="flex h-6 w-6 items-center justify-center text-muted-foreground"
                      aria-label="Retirer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compact payment row */}
          <div className="flex flex-wrap items-center gap-2 px-3 py-2">
            {hasWallet && (
              <button
                type="button"
                onClick={() => setPaymentMode("wallet_full")}
                className={`flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors ${
                  paymentMode !== "on_site"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground hover:border-foreground/40"
                }`}
              >
                <Wallet className="h-3.5 w-3.5" />
                Cagnotte
                <span className="ml-1 font-mono text-[10px] font-semibold opacity-80">
                  {formatPrice(balance)}
                </span>
              </button>
            )}
            {(
              [
                { v: "card" as const, label: "CB", Icon: CreditCard },
                { v: "cash" as const, label: "Espèces", Icon: Banknote },
                { v: "other" as const, label: "Autre", Icon: MoreHorizontal },
              ] satisfies {
                v: OnSiteMethod;
                label: string;
                Icon: React.ComponentType<{ className?: string }>;
              }[]
            ).map(({ v, label, Icon }) => {
              const isSelectedOnSite =
                paymentMode === "on_site" && onSiteMethod === v;
              const isPartialMethod =
                effectivePaymentMode === "wallet_partial" && onSiteMethod === v;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    setOnSiteMethod(v);
                    if (paymentMode !== "on_site" && !hasWallet) {
                      setPaymentMode("on_site");
                    }
                    if (effectivePaymentMode !== "wallet_partial" && paymentMode !== "wallet_full") {
                      setPaymentMode("on_site");
                    }
                  }}
                  className={`flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors ${
                    isSelectedOnSite || isPartialMethod
                      ? "border-foreground bg-foreground/[0.06] text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
            {effectivePaymentMode === "wallet_partial" && (
              <span className="text-[11px] font-medium text-muted-foreground">
                Reste {formatPrice(remainder)} à encaisser
              </span>
            )}

            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-xl font-bold tabular-nums">
                {formatPrice(totalPrice)}
              </span>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="h-10 rounded-full px-5 text-sm font-semibold"
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Envoyer
              </Button>
            </div>
          </div>
        </footer>
      </DrawerContent>
    </Drawer>
  );
}
