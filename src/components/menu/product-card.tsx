"use client";

import { useState } from "react";
import type { ProductWithModifiers } from "@/lib/types";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice } from "@/lib/format";
import { ModifierModal } from "./modifier-modal";
import { toast } from "sonner";
import Image from "next/image";
import { Plus } from "lucide-react";

export function ProductCard({ product }: { product: ProductWithModifiers }) {
  const [showModal, setShowModal] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  const hasModifiers = product.modifier_groups.length > 0;

  const handleClick = () => {
    if (!product.is_available) return;

    if (hasModifiers) {
      setShowModal(true);
    } else {
      addItem({
        product_id: product.id,
        product_name: product.name,
        base_price: product.price,
        quantity: 1,
        modifiers: [],
      });
      toast.success(`${product.name} ajout\u00E9 au panier`);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={!product.is_available}
        className="relative flex w-full items-start gap-3 rounded-xl border border-border bg-card p-3.5 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold leading-tight">
            {product.name}
          </h3>
          {product.description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {product.description}
            </p>
          )}
          <p className="mt-2 text-sm font-bold text-primary">{formatPrice(product.price)}</p>
        </div>
        {product.image_url ? (
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
              sizes="80px"
            />
            <div className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
              <Plus className="h-3 w-3" />
            </div>
          </div>
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Plus className="h-4 w-4" />
          </div>
        )}
        {!product.is_available && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/80">
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              Indisponible
            </span>
          </div>
        )}
      </button>

      {showModal && (
        <ModifierModal
          product={product}
          open={showModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
