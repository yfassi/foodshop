"use client";

import type { ProductWithModifiers } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { useCartStore } from "@/stores/cart-store";
import Image from "next/image";
import { Sparkles, Plus } from "lucide-react";
import { toast } from "sonner";

interface FeaturedProductsProps {
  products: ProductWithModifiers[];
  onProductClick: (product: ProductWithModifiers) => void;
}

function hasRequiredModifiers(product: ProductWithModifiers) {
  return product.modifier_groups.some((g) => g.min_select > 0);
}

export function FeaturedProducts({ products, onProductClick }: FeaturedProductsProps) {
  const addItem = useCartStore((s) => s.addItem);

  if (products.length === 0) return null;

  const handleQuickAdd = (e: React.MouseEvent, product: ProductWithModifiers) => {
    e.stopPropagation();
    if (hasRequiredModifiers(product)) {
      onProductClick(product);
      return;
    }
    addItem({
      product_id: product.id,
      product_name: product.name,
      base_price: product.price,
      quantity: 1,
      modifiers: [],
      is_menu: false,
      menu_supplement: product.menu_supplement ?? 0,
    });
    toast.success(`${product.name} ajouté au panier`);
  };

  return (
    <div className="px-4 pt-4 md:px-6">
      {/* Section heading — kit: Poppins 800, tight tracking */}
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#fdebc8] text-[#b75000]">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <h2 className="text-[14px] font-extrabold tracking-[-0.02em] text-[#1c1410]">
          Incontournables
        </h2>
      </div>
      {/* Horizontal rail — 164px cards */}
      <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-2 md:-mx-6 md:px-6">
        {products.map((product) => (
          <div
            key={product.id}
            role="button"
            tabIndex={0}
            onClick={() => onProductClick(product)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onProductClick(product);
              }
            }}
            className="relative flex shrink-0 cursor-pointer flex-col overflow-hidden rounded-[14px] border border-[#dbd7d2] bg-white text-left transition-colors active:opacity-80"
            style={{ width: "164px" }}
          >
            {/* Thumbnail */}
            {product.image_url ? (
              <div className="relative h-28 w-full">
                <Image
                  src={product.image_url}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="164px"
                />
              </div>
            ) : (
              <div className="flex h-28 w-full items-center justify-center bg-gradient-to-br from-[#fdf2e8] to-[#f8e6d3]">
                <Sparkles className="h-7 w-7 text-[#b75000]/40" />
              </div>
            )}
            {/* Body */}
            <div className="px-3.5 pb-3 pt-2.5">
              <p className="truncate text-[14px] font-bold leading-tight tracking-[-0.015em] text-[#1c1410]">
                {product.name}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-mono text-[14px] font-bold text-[#1c1410]">
                  {formatPrice(product.price)}
                </span>
                {/* Quick add button — tomato red circle per kit */}
                <button
                  type="button"
                  onClick={(e) => handleQuickAdd(e, product)}
                  aria-label={`Ajouter ${product.name} au panier`}
                  className="grid h-9 w-9 place-items-center rounded-full bg-[#d7352d] text-white shadow-[0_0_12px_#d7352d4d] transition-transform active:scale-90"
                >
                  <Plus className="h-[18px] w-[18px]" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
