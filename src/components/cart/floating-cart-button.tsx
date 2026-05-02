"use client";

import { useState, useEffect, useRef } from "react";
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

  useEffect(() => {
    if (lastAddedAt > 0 && lastAddedAt !== prevLastAdded.current) {
      prevLastAdded.current = lastAddedAt;
      setBounce(true);
      const timer = setTimeout(() => setBounce(false), 600);
      return () => clearTimeout(timer);
    }
  }, [lastAddedAt]);

  if (items.length === 0) return null;

  const count = totalItems();
  const total = totalPrice();

  return (
    <>
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-3xl px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-6">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background via-background/85 to-transparent" />
        <button
          onClick={() => setOpen(true)}
          aria-label={`Voir mon panier — ${count} article${count > 1 ? "s" : ""}, ${formatPrice(total)}`}
          className="pointer-events-auto relative flex w-full items-center gap-3 rounded-2xl bg-primary px-4 py-3.5 text-primary-foreground shadow-xl shadow-black/20 transition-transform active:scale-[0.99]"
          style={bounce ? { animation: "cart-bounce 0.5s ease-in-out" } : undefined}
        >
          <span className="grid h-[26px] w-[26px] place-items-center rounded-lg bg-background font-mono text-xs font-bold text-primary">
            {count}
          </span>
          <span className="text-sm font-semibold tracking-tight">
            Voir mon panier
          </span>
          <span className="ml-auto font-mono text-sm font-bold">
            {formatPrice(total)}
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
