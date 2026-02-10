"use client";

import { forwardRef } from "react";
import type { CategoryWithProducts } from "@/lib/types";
import { ProductCard } from "./product-card";
import { getCategoryIcon } from "@/lib/category-icons";

export const CategorySection = forwardRef<
  HTMLDivElement,
  { category: CategoryWithProducts }
>(function CategorySection({ category }, ref) {
  if (category.products.length === 0) return null;

  const Icon = getCategoryIcon(category.icon);

  return (
    <section ref={ref} className="mb-6 scroll-mt-14">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold tracking-tight">
          {category.name}
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {category.products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
});
