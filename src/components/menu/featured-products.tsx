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
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-warning-soft text-warning">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <h2 className="text-[15px] font-bold tracking-tight">Incontournables</h2>
      </div>
      <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-2 md:-mx-6 md:px-6">
        {products.map((product) => (
          <button
            key={product.id}
            onClick={() => onProductClick(product)}
            className="relative flex shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-card text-left transition-colors active:bg-accent/40"
            style={{ width: "148px" }}
          >
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
              <div className="flex h-24 w-full items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 text-3xl">
                ⭐
              </div>
            )}
            <div className="px-3 pb-3 pt-2.5">
              <p className="truncate text-[13px] font-semibold leading-tight tracking-tight">
                {product.name}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-mono text-[13px] font-bold">
                  {formatPrice(product.price)}
                </span>
                <span
                  aria-hidden
                  className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground"
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
