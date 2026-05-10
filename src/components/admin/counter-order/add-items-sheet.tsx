"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import type { CartItem, CategoryWithProducts, Order, OrderType } from "@/lib/types";
import { MenuPicker } from "./menu-picker";
import { Loader2, Minus, Plus, Trash2, X } from "lucide-react";

interface AddItemsSheetProps {
  open: boolean;
  onClose: () => void;
  publicId: string;
  order: Order;
}

const orderTypeLabels: Record<OrderType, string> = {
  dine_in: "Sur place",
  takeaway: "À emporter",
  delivery: "Livraison",
};

export function AddItemsSheet({ open, onClose, publicId, order }: AddItemsSheetProps) {
  const [menu, setMenu] = useState<CategoryWithProducts[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuLayout, setMenuLayout] = useState<"linear" | "category_grid">("linear");
  const [items, setItems] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setItems([]);
      return;
    }
    setMenuLoading(true);
    fetch(`/api/admin/menu?restaurant_public_id=${encodeURIComponent(publicId)}`)
      .then((r) => r.json())
      .then((data) => {
        setMenu(data.menu || []);
        setMenuLayout(
          data.menu_layout === "category_grid" ? "category_grid" : "linear",
        );
      })
      .catch(() => toast.error("Impossible de charger le menu"))
      .finally(() => setMenuLoading(false));
  }, [open, publicId]);

  const extraTotal = useMemo(
    () => items.reduce((s, i) => s + i.line_total, 0),
    [items],
  );

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
        .filter((i): i is CartItem => i !== null),
    );
  };

  const handleSubmit = async () => {
    if (items.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/orders/counter/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      toast.success(
        `${data.added_count} article${data.added_count > 1 ? "s" : ""} ajouté${data.added_count > 1 ? "s" : ""} à la commande`,
      );
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'ajout");
    } finally {
      setSubmitting(false);
    }
  };

  const orderLabel = order.display_order_number || `#${order.order_number}`;

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="!mt-0 h-[100dvh] !max-h-[100dvh] !rounded-none [&>div:first-child]:hidden">
        <DrawerTitle className="sr-only">
          Ajouter des articles à la commande {orderLabel}
        </DrawerTitle>

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
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">
              + Ajouter
            </span>
            <span className="font-mono text-sm font-bold">{orderLabel}</span>
            {order.customer_info?.name && (
              <span className="truncate text-sm text-muted-foreground">
                · {order.customer_info.name}
              </span>
            )}
            {order.order_type && (
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {orderTypeLabels[order.order_type]}
              </span>
            )}
          </div>
        </header>

        {/* === Main: menu + side cart of NEW items only === */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
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

          <aside className="hidden w-[22rem] shrink-0 flex-col border-l border-border bg-muted/20 md:flex">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                À ajouter
              </p>
              <span className="font-mono text-xs font-semibold text-muted-foreground">
                {items.reduce((s, i) => s + i.quantity, 0)}
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <p className="p-6 text-center text-xs text-muted-foreground">
                  Cliquez sur un article pour l&apos;ajouter à la commande.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {items.map((i) => (
                    <CartRow
                      key={i.id}
                      item={i}
                      onMinus={() => handleQuantity(i.id, -1)}
                      onPlus={() => handleQuantity(i.id, +1)}
                      onRemove={() =>
                        setItems((prev) => prev.filter((x) => x.id !== i.id))
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* === Bottom bar === */}
        <footer className="border-t border-border bg-background">
          {items.length > 0 && (
            <div className="max-h-40 overflow-y-auto border-b border-border md:hidden">
              <div className="divide-y divide-border">
                {items.map((i) => (
                  <CartRow
                    key={i.id}
                    item={i}
                    onMinus={() => handleQuantity(i.id, -1)}
                    onPlus={() => handleQuantity(i.id, +1)}
                    onRemove={() =>
                      setItems((prev) => prev.filter((x) => x.id !== i.id))
                    }
                    compact
                  />
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 px-3 py-2">
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {formatPrice(order.total_price)}
              </span>{" "}
              déjà commandé
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">À ajouter</span>
              <span className="text-xl font-bold tabular-nums">
                {formatPrice(extraTotal)}
              </span>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={items.length === 0 || submitting}
                className="h-10 rounded-full px-5 text-sm font-semibold"
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Ajouter à la commande
              </Button>
            </div>
          </div>
        </footer>
      </DrawerContent>
    </Drawer>
  );
}

function CartRow({
  item,
  onMinus,
  onPlus,
  onRemove,
  compact = false,
}: {
  item: CartItem;
  onMinus: () => void;
  onPlus: () => void;
  onRemove: () => void;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 ${compact ? "px-3 py-2" : "px-3 py-2.5"}`}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {item.product_name}
          {item.is_menu && (
            <span className="ml-1 text-xs font-semibold text-primary">(Menu)</span>
          )}
        </p>
        {!compact && item.modifiers.length > 0 && (
          <p className="truncate text-[11px] text-muted-foreground">
            {item.modifiers.map((m) => m.modifier_name).join(", ")}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 rounded-lg bg-muted">
        <button
          type="button"
          onClick={onMinus}
          className="flex h-7 w-7 items-center justify-center"
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
        <button
          type="button"
          onClick={onPlus}
          className="flex h-7 w-7 items-center justify-center"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
      <p className="w-14 text-right text-sm font-semibold tabular-nums">
        {formatPrice(item.line_total)}
      </p>
      <button
        type="button"
        onClick={onRemove}
        className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-destructive"
        aria-label="Retirer"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
