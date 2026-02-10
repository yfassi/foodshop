"use client";

import { forwardRef } from "react";
import Image from "next/image";
import type { CategoryWithProducts } from "@/lib/types";
import { ProductCard } from "./product-card";

export const CategorySection = forwardRef<
  HTMLDivElement,
  { category: CategoryWithProducts }
>(function CategorySection({ category }, ref) {
  if (category.products.length === 0) return null;

  return (
    <section ref={ref} className="mb-6 scroll-mt-14">
      {category.image_url && (
        <div className="relative mb-3 h-32 w-full overflow-hidden rounded-xl">
          <Image
            src={category.image_url}
            alt={category.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 672px"
          />
        </div>
      )}
      <h2 className="mb-3 text-lg font-bold tracking-tight">
        {category.name}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {category.products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
});
