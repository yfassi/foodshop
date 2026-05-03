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
  const modifiersSummary = parts.join(" · ");
  const isReward = item.base_price === 0;

  return (
    <div className="flex items-center gap-3 border-b border-border/60 py-3 last:border-b-0">
      {isReward && (
        <div className="grid h-[54px] w-[54px] shrink-0 place-items-center rounded-xl bg-muted text-2xl">
          🎁
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold">{item.product_name}</p>
        {modifiersSummary && (
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {modifiersSummary}
          </p>
        )}
        {isReward ? (
          <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700">
            Offert
          </span>
        ) : (
          <p className="mt-1 font-mono text-[13px] font-bold">
            {formatPrice(item.line_total)}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {isReward ? (
          <button
            onClick={() => removeItem(item.id)}
            aria-label="Retirer la récompense du panier"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : (
          <>
            <div className="inline-flex items-center overflow-hidden rounded-lg bg-muted">
              <button
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                aria-label="Diminuer la quantité"
                className="grid h-8 w-8 place-items-center text-foreground transition-colors active:bg-border"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-6 text-center font-mono text-[13px] font-bold tabular-nums">
                {item.quantity}
              </span>
              <button
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                aria-label="Augmenter la quantité"
                className="grid h-8 w-8 place-items-center text-foreground transition-colors active:bg-border"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              onClick={() => removeItem(item.id)}
              aria-label="Supprimer du panier"
              className="text-[10px] font-medium text-muted-foreground transition-colors hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
