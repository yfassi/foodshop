"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import type { CartItem as CartItemType } from "@/lib/types";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice } from "@/lib/format";

export function CartItem({ item }: { item: CartItemType }) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const parts = [
    ...(item.is_menu ? ["Menu"] : []),
    ...item.modifiers.map((m) => m.modifier_name),
  ];
  const modifiersSummary = parts.join(", ");

  return (
    <div className="flex items-start gap-3 border-b border-border py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{item.product_name}</p>
        {modifiersSummary && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {modifiersSummary}
          </p>
        )}
        <p className="price-mono mt-1 text-sm font-bold text-primary">
          {formatPrice(item.line_total)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="flex items-center overflow-hidden rounded-xl bg-muted">
          <button
            onClick={() => updateQuantity(item.id, item.quantity - 1)}
            aria-label="Diminuer la quantité"
            className="flex h-10 w-10 items-center justify-center transition-colors active:bg-border"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="price-mono min-w-[2rem] text-center text-sm font-bold">
            {item.quantity}
          </span>
          <button
            onClick={() => updateQuantity(item.id, item.quantity + 1)}
            aria-label="Augmenter la quantité"
            className="flex h-10 w-10 items-center justify-center transition-colors active:bg-border"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <button
          onClick={() => removeItem(item.id)}
          aria-label="Supprimer du panier"
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors active:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
