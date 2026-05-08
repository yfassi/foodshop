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
      {/* Section heading — kit: Poppins 800, -0.02em tracking */}
      <div className="mb-2.5 flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#fdf9f3] text-[#68625e]">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h2 className="text-[14px] font-extrabold tracking-[-0.02em] text-[#1c1410]">
          {category.name}
        </h2>
        <span className="ml-1 font-mono text-[11px] font-semibold text-[#a89e94]">
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
        /* List rows — no card wrapper, dashed dividers via product-card itself */
        <div className="flex flex-col">
          {category.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
});
