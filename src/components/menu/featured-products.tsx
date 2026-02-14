"use client";

import type { ProductWithModifiers } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import Image from "next/image";
import { Sparkles } from "lucide-react";

interface FeaturedProductsProps {
  products: ProductWithModifiers[];
  onProductClick: (product: ProductWithModifiers) => void;
}

export function FeaturedProducts({ products, onProductClick }: FeaturedProductsProps) {
  if (products.length === 0) return null;

  return (
    <div className="px-4 pt-4 md:px-6">
      <div className="mb-3 flex items-center gap-1.5">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold">Nos incontournables</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {products.map((product) => (
          <button
            key={product.id}
            onClick={() => onProductClick(product)}
            className="flex shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
            style={{ width: "140px" }}
          >
            {product.image_url ? (
              <div className="relative h-24 w-full">
                <Image
                  src={product.image_url}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="140px"
                />
              </div>
            ) : (
              <div className="flex h-24 w-full items-center justify-center bg-muted">
                <Sparkles className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="p-2.5">
              <p className="truncate text-xs font-semibold">{product.name}</p>
              <p className="mt-0.5 text-xs font-bold text-primary">
                {formatPrice(product.price)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
