"use client";

import { useState, useEffect, useRef } from "react";
import { ShoppingBag } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice } from "@/lib/format";
import { CartDrawer } from "./cart-drawer";
import type { CategoryWithProducts } from "@/lib/types";

export function FloatingCartButton({
  slug,
  disabled,
  categories,
  queueEnabled,
}: {
  slug: string;
  disabled?: boolean;
  categories?: CategoryWithProducts[];
  queueEnabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const items = useCartStore((s) => s.items);
  const totalPrice = useCartStore((s) => s.totalPrice);
  const totalItems = useCartStore((s) => s.totalItems);
  const lastAddedAt = useCartStore((s) => s.lastAddedAt);
  const [bounce, setBounce] = useState(false);
  const prevLastAdded = useRef(lastAddedAt);

  // Trigger bounce animation when new item is added
  useEffect(() => {
    if (lastAddedAt > 0 && lastAddedAt !== prevLastAdded.current) {
      prevLastAdded.current = lastAddedAt;
      setBounce(true);
      const timer = setTimeout(() => setBounce(false), 600);
      return () => clearTimeout(timer);
    }
  }, [lastAddedAt]);

  if (items.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-3xl px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 rounded-2xl bg-primary px-4 py-3 text-primary-foreground shadow-xl shadow-black/20 transition-colors active:bg-primary/90"
          style={bounce ? { animation: "cart-bounce 0.5s ease-in-out" } : undefined}
        >
          <span className="price-mono flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-foreground text-xs font-bold text-primary">
            {totalItems()}
          </span>
          <span className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <ShoppingBag className="h-4 w-4" />
            Voir mon panier
          </span>
          <span className="price-mono ml-auto text-sm font-semibold">
            {formatPrice(totalPrice())}
          </span>
        </button>
      </div>

      <CartDrawer
        open={open}
        onClose={() => setOpen(false)}
        slug={slug}
        disabled={disabled}
        categories={categories}
        queueEnabled={queueEnabled}
      />

    </>
  );
}
