"use client";

import { forwardRef } from "react";
import type { CategoryWithProducts } from "@/lib/types";
import { ProductCard } from "./product-card";
import { ProductCardSmall } from "./product-card-small";
import { getCategoryIcon } from "@/lib/category-icons";

export const CategorySection = forwardRef<
  HTMLDivElement,
  { category: CategoryWithProducts; horizontal?: boolean }
>(function CategorySection({ category, horizontal }, ref) {
  if (category.products.length === 0) return null;

  const Icon = getCategoryIcon(category.icon);

  return (
    <section ref={ref} className="mb-6 scroll-mt-14">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-base font-semibold tracking-tight">
          {category.name}
        </h2>
      </div>
      {horizontal ? (
        <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-2 md:-mx-6 md:px-6">
          {category.products.map((product) => (
            <ProductCardSmall key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {category.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
});
