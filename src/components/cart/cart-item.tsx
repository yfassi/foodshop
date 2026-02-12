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
        <p className="mt-1 text-sm font-bold text-primary">
          {formatPrice(item.line_total)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          onClick={() => updateQuantity(item.id, item.quantity - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border transition-colors hover:bg-accent"
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className="min-w-[1.5rem] text-center text-sm font-semibold">
          {item.quantity}
        </span>
        <button
          onClick={() => updateQuantity(item.id, item.quantity + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border transition-colors hover:bg-accent"
        >
          <Plus className="h-3 w-3" />
        </button>
        <button
          onClick={() => removeItem(item.id)}
          className="ml-1 flex h-8 w-8 items-center justify-center rounded-full text-destructive transition-colors hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
