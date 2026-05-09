"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type { CategoryWithProducts, ProductWithModifiers } from "@/lib/types";
import { CategorySection } from "./category-section";
import { FeaturedProducts } from "./featured-products";
import { FloatingCartButton } from "@/components/cart/floating-cart-button";
import { ModifierModal } from "./modifier-modal";
import { useCartStore } from "@/stores/cart-store";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { isCurrentlyOpen } from "@/lib/constants";
import { Search, X } from "lucide-react";
import { WelcomeModal } from "./welcome-modal";
import type { OrderType } from "@/lib/types";

export function MenuGrid({
  categories,
  isAcceptingOrders,
  openingHours,
  publicId,
  restaurantName,
  logoUrl,
  orderTypes,
  loyaltyEnabled,
  queueEnabled,
}: {
  categories: CategoryWithProducts[];
  isAcceptingOrders: boolean;
  openingHours: Record<string, unknown> | null;
  publicId: string;
  restaurantName: string;
  logoUrl: string | null;
  orderTypes: OrderType[];
  loyaltyEnabled: boolean;
  queueEnabled: boolean;
}) {
  const setRestaurantPublicId = useCartStore((s) => s.setRestaurantPublicId);
  const orderType = useCartStore((s) => s.orderType);
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(() => isCurrentlyOpen(openingHours));
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ProductWithModifiers | null>(null);

  useEffect(() => {
    const check = () => setIsOpen(isCurrentlyOpen(openingHours));
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [openingHours]);
  const categoryRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const chipRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [activeCategoryId, setActiveCategoryId] = useState<string>(
    categories[0]?.id ?? ""
  );
  const isScrollingTo = useRef(false);

  useEffect(() => {
    setRestaurantPublicId(publicId);
    setHydrated(true);
  }, [publicId, setRestaurantPublicId]);

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

  // Filter categories/products by search query
  const query = searchQuery.toLowerCase().trim();
  const filteredCategories = query
    ? categories
        .map((cat) => ({
          ...cat,
          products: cat.products.filter((p) =>
            p.name.toLowerCase().includes(query)
          ),
        }))
        .filter((cat) => cat.products.length > 0)
    : categories;

  // Collect featured products (only when not searching)
  const featuredProducts = query
    ? []
    : categories.flatMap((cat) =>
        cat.products.filter((p) => p.is_featured && p.is_available)
      );

  return (
    <div>
      {/* Sticky category nav + search */}
      <nav className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm">
        {/* Search bar — pill, gris clair (matches mobile UI kit) */}
        <div className="px-4 pt-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un plat, une boisson…"
              aria-label="Rechercher un produit"
              className="h-11 w-full rounded-full border border-transparent bg-muted pl-10 pr-9 text-sm outline-none transition-all placeholder:text-muted-foreground/70 focus:border-border focus:bg-background"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                aria-label="Effacer la recherche"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category chips (hidden when searching) */}
        {!query && (
          <ScrollArea className="w-full">
            <div className="flex gap-1.5 px-4 py-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  ref={(el) => {
                    if (el) chipRefs.current.set(cat.id, el);
                  }}
                  onClick={() => scrollToCategory(cat.id)}
                  className={`h-[34px] shrink-0 whitespace-nowrap rounded-full border-[1.5px] px-3.5 text-[13px] font-medium transition-colors ${
                    activeCategoryId === cat.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-muted-foreground/40 active:text-foreground"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </nav>

      {/* Featured products (only when not searching) */}
      {featuredProducts.length > 0 && (
        <FeaturedProducts
          products={featuredProducts}
          onProductClick={setSelectedProduct}
        />
      )}

      {/* Categories + products */}
      <div className="px-4 py-4 md:px-6">
        {filteredCategories.length === 0 && query ? (
          <div className="flex flex-col items-center py-12">
            <Search className="mb-2 h-6 w-6 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Aucun produit trouvé pour &quot;{searchQuery}&quot;
            </p>
          </div>
        ) : (
          filteredCategories.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              horizontal={category.name.toLowerCase() === "nouveautés"}
              ref={(el) => {
                if (el) categoryRefs.current.set(category.id, el);
              }}
            />
          ))
        )}
      </div>

      {/* Floating cart button */}
      <FloatingCartButton publicId={publicId} disabled={!isAcceptingOrders || !isOpen} categories={categories} queueEnabled={queueEnabled} />

      {/* Featured product modal */}
      {selectedProduct && (
        <ModifierModal
          product={selectedProduct}
          open={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* Welcome modal */}
      <WelcomeModal
        open={hydrated && !orderType}
        restaurantName={restaurantName}
        logoUrl={logoUrl}
        orderTypes={orderTypes}
        loyaltyEnabled={loyaltyEnabled}
        publicId={publicId}
      />
    </div>
  );
}
