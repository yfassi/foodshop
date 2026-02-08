"use client";

import { forwardRef } from "react";
import type { CategoryWithProducts } from "@/lib/types";
import { ProductCard } from "./product-card";

export const CategorySection = forwardRef<
  HTMLDivElement,
  { category: CategoryWithProducts }
>(function CategorySection({ category }, ref) {
  if (category.products.length === 0) return null;

  return (
    <section ref={ref} className="mb-6 scroll-mt-14">
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
