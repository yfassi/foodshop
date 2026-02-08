"use client";

import { useRef, useEffect, useState, useCallback } from "react";
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
  const chipRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [activeCategoryId, setActiveCategoryId] = useState<string>(
    categories[0]?.id ?? ""
  );
  const isScrollingTo = useRef(false);

  useEffect(() => {
    setRestaurantSlug(slug);
  }, [slug, setRestaurantSlug]);

  // IntersectionObserver to track which category section is in view
  useEffect(() => {
    const elements = Array.from(categoryRefs.current.entries());
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingTo.current) return;

        // Find the topmost visible section
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              a.boundingClientRect.top - b.boundingClientRect.top
          );

        if (visible.length > 0) {
          const id = Array.from(categoryRefs.current.entries()).find(
            ([, el]) => el === visible[0].target
          )?.[0];
          if (id) setActiveCategoryId(id);
        }
      },
      { rootMargin: "-56px 0px -60% 0px", threshold: 0 }
    );

    elements.forEach(([, el]) => observer.observe(el));
    return () => observer.disconnect();
  }, [categories]);

  // Auto-scroll the chip bar to keep the active chip visible
  useEffect(() => {
    const chip = chipRefs.current.get(activeCategoryId);
    if (chip) {
      chip.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeCategoryId]);

  const scrollToCategory = useCallback((categoryId: string) => {
    const el = categoryRefs.current.get(categoryId);
    if (el) {
      isScrollingTo.current = true;
      setActiveCategoryId(categoryId);
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      // Re-enable observer after scroll settles
      setTimeout(() => {
        isScrollingTo.current = false;
      }, 800);
    }
  }, []);

  return (
    <div>
      {/* Sticky category nav */}
      <nav className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm">
        <ScrollArea className="w-full">
          <div className="flex gap-1.5 px-3 py-2.5">
            {categories.map((cat) => (
              <button
                key={cat.id}
                ref={(el) => {
                  if (el) chipRefs.current.set(cat.id, el);
                }}
                onClick={() => scrollToCategory(cat.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  activeCategoryId === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary hover:bg-primary hover:text-primary-foreground"
                }`}
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
