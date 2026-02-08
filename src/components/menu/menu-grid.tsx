"use client";

import { useRef, useEffect } from "react";
import type { CategoryWithProducts } from "@/lib/types";
import { CategorySection } from "./category-section";
import { FloatingCartButton } from "@/components/cart/floating-cart-button";
import { useCartStore } from "@/stores/cart-store";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export function MenuGrid({
  categories,
  isAcceptingOrders,
  slug,
}: {
  categories: CategoryWithProducts[];
  isAcceptingOrders: boolean;
  slug: string;
}) {
  const setRestaurantSlug = useCartStore((s) => s.setRestaurantSlug);
  const categoryRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    setRestaurantSlug(slug);
  }, [slug, setRestaurantSlug]);

  const scrollToCategory = (categoryId: string) => {
    const el = categoryRefs.current.get(categoryId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div>
      {/* Sticky category nav */}
      <nav className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm">
        <ScrollArea className="w-full">
          <div className="flex gap-1.5 px-3 py-2.5">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => scrollToCategory(cat.id)}
                className="shrink-0 rounded-full bg-secondary px-4 py-2 text-sm font-medium transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                {cat.name}
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </nav>

      {/* Categories + products */}
      <div className="px-4 py-4 md:px-6">
        {categories.map((category) => (
          <CategorySection
            key={category.id}
            category={category}
            ref={(el) => {
              if (el) categoryRefs.current.set(category.id, el);
            }}
          />
        ))}
      </div>

      {/* Floating cart button */}
      <FloatingCartButton slug={slug} disabled={!isAcceptingOrders} />
    </div>
  );
}
