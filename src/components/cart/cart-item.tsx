"use client";

import { Minus, Plus, Trash2, Gift } from "lucide-react";
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
    /* Cart item row — kit: dashed bottom border, 10px gap, items-center */
    <div className="flex items-center gap-2.5 border-b border-dashed border-[#dbd7d2] py-3 last:border-b-0">
      {/* Thumbnail placeholder — kit: 54×54, radius 10px, fdf9f3 bg */}
      {isReward && (
        <div className="grid h-[54px] w-[54px] shrink-0 place-items-center rounded-[10px] bg-[#fdf9f3]">
          <Gift className="h-6 w-6 text-[#d7352d]" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-bold text-[#1c1410]">{item.product_name}</p>
        {modifiersSummary && (
          <p className="mt-0.5 truncate text-[11px] text-[#68625e]">
            {modifiersSummary}
          </p>
        )}
        {isReward ? (
          <span className="mt-1 inline-block rounded-full bg-[#d8efd9] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#00873a]">
            Offert
          </span>
        ) : (
          <p className="mt-1.5 font-mono text-[13px] font-bold text-[#1c1410]">
            {formatPrice(item.line_total)}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {isReward ? (
          <button
            onClick={() => removeItem(item.id)}
            aria-label="Retirer la récompense du panier"
            className="grid h-8 w-8 place-items-center rounded-lg text-[#68625e] transition-colors hover:text-[#bf000f]"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : (
          <>
            {/* Stepper — kit: pill-shaped, fdf9f3 bg, dbd7d2 border, Space Mono count */}
            <div className="inline-flex items-center overflow-hidden rounded-full border-[1.5px] border-[#dbd7d2] bg-[#fdf9f3]">
              <button
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                aria-label="Diminuer la quantité"
                className="grid h-8 w-8 place-items-center text-[#1c1410] transition-colors active:bg-[#f0ebe1]"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-6 text-center font-mono text-[13px] font-bold tabular-nums text-[#1c1410]">
                {item.quantity}
              </span>
              <button
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                aria-label="Augmenter la quantité"
                className="grid h-8 w-8 place-items-center text-[#1c1410] transition-colors active:bg-[#f0ebe1]"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              onClick={() => removeItem(item.id)}
              aria-label="Supprimer du panier"
              className="text-[#a89e94] transition-colors hover:text-[#bf000f]"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
