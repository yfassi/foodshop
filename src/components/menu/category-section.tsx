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
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h2 className="text-[15px] font-bold tracking-tight">
          {category.name}
        </h2>
        <span className="ml-1 font-mono text-[11px] font-semibold text-muted-foreground">
          {category.products.length}
        </span>
      </div>
      {horizontal ? (
        <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-2 md:-mx-6 md:px-6">
          {category.products.map((product) => (
            <ProductCardSmall key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {category.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
});
