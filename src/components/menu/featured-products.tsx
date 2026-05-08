"use client";

import type { ProductWithModifiers } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import Image from "next/image";
import { Sparkles, Plus } from "lucide-react";

interface FeaturedProductsProps {
  products: ProductWithModifiers[];
  onProductClick: (product: ProductWithModifiers) => void;
}

export function FeaturedProducts({ products, onProductClick }: FeaturedProductsProps) {
  if (products.length === 0) return null;

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
      {/* Horizontal rail — kit: 148px cards, 10px gap, overflow-x */}
      <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-2 md:-mx-6 md:px-6">
        {products.map((product) => (
          <button
            key={product.id}
            onClick={() => onProductClick(product)}
            className="relative flex shrink-0 flex-col overflow-hidden rounded-[14px] border border-[#dbd7d2] bg-white text-left transition-colors active:opacity-80"
            style={{ width: "148px" }}
          >
            {/* Thumbnail */}
            {product.image_url ? (
              <div className="relative h-24 w-full">
                <Image
                  src={product.image_url}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="148px"
                />
              </div>
            ) : (
              <div className="flex h-24 w-full items-center justify-center bg-gradient-to-br from-[#fdf2e8] to-[#f8e6d3]">
                <Sparkles className="h-7 w-7 text-[#b75000]/40" />
              </div>
            )}
            {/* Body */}
            <div className="px-3 pb-3 pt-2.5">
              <p className="truncate text-[13px] font-bold leading-tight tracking-[-0.015em] text-[#1c1410]">
                {product.name}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-mono text-[13px] font-bold text-[#1c1410]">
                  {formatPrice(product.price)}
                </span>
                {/* Add button — tomato red circle per kit */}
                <span
                  aria-hidden
                  className="grid h-7 w-7 place-items-center rounded-full bg-[#d7352d] text-white shadow-[0_0_12px_#d7352d4d]"
                >
                  <Plus className="h-4 w-4" />
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
