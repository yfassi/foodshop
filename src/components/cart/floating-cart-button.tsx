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
  upsellThreshold,
}: {
  slug: string;
  disabled?: boolean;
  categories?: CategoryWithProducts[];
  upsellThreshold?: number | null;
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
      <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-3xl p-3">
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-between rounded-2xl bg-primary px-5 py-4 text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
          style={bounce ? { animation: "cart-bounce 0.5s ease-in-out" } : undefined}
        >
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-5 w-5" />
            <span className="text-sm font-semibold">
              Voir mon panier ({totalItems()})
            </span>
          </div>
          <span className="text-sm font-bold">
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
        upsellThreshold={upsellThreshold}
      />

    </>
  );
}
