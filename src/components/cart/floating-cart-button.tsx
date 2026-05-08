"use client";

import { useState, useEffect, useRef } from "react";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice } from "@/lib/format";
import { CartDrawer } from "./cart-drawer";
import type { CategoryWithProducts } from "@/lib/types";

export function FloatingCartButton({
  publicId,
  disabled,
  categories,
  queueEnabled,
}: {
  publicId: string;
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
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-3xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6">
        {/* Fade gradient beneath the FAB */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white via-white/85 to-transparent" />
        {/* Cart FAB — kit: dark pill (#1c1410) + red circle count badge + mono total */}
        <button
          onClick={() => setOpen(true)}
          aria-label={`Voir mon panier — ${count} article${count > 1 ? "s" : ""}, ${formatPrice(total)}`}
          className="pointer-events-auto relative flex w-full items-center gap-3 rounded-full bg-[#1c1410] px-4 py-3 text-white transition-transform active:scale-[0.99]"
          style={{
            boxShadow: "0 16px 32px -10px #1c141066, inset 0 0 0 1px #ffffff14",
            ...(bounce ? { animation: "cart-bounce 0.5s ease-in-out" } : {}),
          }}
        >
          {/* Count badge — tomato red circle */}
          <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-[#d7352d] font-mono text-[12px] font-bold text-white">
            {count}
          </span>
          <span className="text-[14px] font-semibold tracking-[-0.01em]">
            Voir mon panier
          </span>
          <span className="ml-auto font-mono text-[14px] font-bold">
            {formatPrice(total)}
          </span>
        </button>
      </div>

      <CartDrawer
        open={open}
        onClose={() => setOpen(false)}
        publicId={publicId}
        disabled={disabled}
        categories={categories}
        queueEnabled={queueEnabled}
      />

    </>
  );
}
