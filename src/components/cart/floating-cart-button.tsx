"use client";

import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice } from "@/lib/format";
import { CartDrawer } from "./cart-drawer";

export function FloatingCartButton({
  slug,
  disabled,
}: {
  slug: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const items = useCartStore((s) => s.items);
  const totalPrice = useCartStore((s) => s.totalPrice);
  const totalItems = useCartStore((s) => s.totalItems);

  if (items.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-3xl p-3">
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-between rounded-2xl bg-primary px-5 py-4 text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
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
      />
    </>
  );
}
