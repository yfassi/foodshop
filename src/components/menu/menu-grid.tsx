"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type { CategoryWithProducts, MenuLayout, ProductWithModifiers } from "@/lib/types";
import { CategorySection } from "./category-section";
import { CategoryTileGrid } from "./category-grid";
import { FeaturedProducts } from "./featured-products";
import { FloatingCartButton } from "@/components/cart/floating-cart-button";
import { ModifierModal } from "./modifier-modal";
import { useCartStore } from "@/stores/cart-store";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { isCurrentlyOpen } from "@/lib/constants";
import { ArrowLeft, Search, X } from "lucide-react";
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
  menuLayout = "linear",
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
  menuLayout?: MenuLayout;
}) {
  const setRestaurantPublicId = useCartStore((s) => s.setRestaurantPublicId);
  const orderType = useCartStore((s) => s.orderType);
  const browseMode = useCartStore((s) => s.browseMode);
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

  // category_grid mode: which category the user has drilled into.
  // null = show the tile grid landing.
  const [pickedCategoryId, setPickedCategoryId] = useState<string | null>(null);
  const isCategoryGrid = menuLayout === "category_grid";
  const showTileLanding = isCategoryGrid && !pickedCategoryId && !searchQuery;

  const handlePickCategory = useCallback((categoryId: string) => {
    setPickedCategoryId(categoryId);
    setActiveCategoryId(categoryId);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }, []);

  const handleBackToTiles = useCallback(() => {
    setPickedCategoryId(null);
    setSearchQuery("");
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }, []);

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
  const searchedCategories = query
    ? categories
        .map((cat) => ({
          ...cat,
          products: cat.products.filter((p) =>
            p.name.toLowerCase().includes(query)
          ),
        }))
        .filter((cat) => cat.products.length > 0)
    : categories;

  // In category_grid + drilled-in mode without a search, show only the picked
  // category. Search overrides the picked category and falls back to all
  // matching categories.
  const filteredCategories =
    isCategoryGrid && pickedCategoryId && !query
      ? searchedCategories.filter((c) => c.id === pickedCategoryId)
      : searchedCategories;

  // Collect featured products (only when not searching, only on linear).
  const featuredProducts =
    query || isCategoryGrid
      ? []
      : categories.flatMap((cat) =>
          cat.products.filter((p) => p.is_featured && p.is_available)
        );

  return (
    <div>
      {/* Sticky category nav + search */}
      <nav className="sticky top-0 z-10 border-b border-[#E6D9C2] bg-[#F5EBDB]/95 backdrop-blur-sm">
        {/* Search bar — pill, fond crème (kit mobile) */}
        <div className="flex items-center gap-2 px-4 pt-3">
          {isCategoryGrid && pickedCategoryId && (
            <button
              type="button"
              onClick={handleBackToTiles}
              aria-label="Retour aux catégories"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[#dbd7d2] bg-white text-[#1c1410] transition-colors hover:border-[#1c1410]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-[#68625e]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un plat, une boisson…"
              aria-label="Rechercher un produit"
              className="h-11 w-full rounded-full border-[1.5px] border-[#dbd7d2] bg-[#fdf9f3] pl-10 pr-9 text-[14px] font-medium text-[#1c1410] outline-none transition-all placeholder:text-[#a89e94] focus:border-[#1c1410] focus:bg-white focus:shadow-[0_0_0_3px_#1c14100f]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                aria-label="Effacer la recherche"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#68625e] transition-colors hover:text-[#1c1410]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category pills (hidden when searching, hidden on tile landing) */}
        {!query && !showTileLanding && (
          <ScrollArea className="w-full">
            <div className="flex gap-1.5 px-4 py-2.5">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  ref={(el) => {
                    if (el) chipRefs.current.set(cat.id, el);
                  }}
                  onClick={() =>
                    isCategoryGrid ? handlePickCategory(cat.id) : scrollToCategory(cat.id)
                  }
                  className={`h-[34px] shrink-0 whitespace-nowrap rounded-full border-[1.5px] px-3.5 text-[13px] font-medium transition-all ${
                    activeCategoryId === cat.id
                      ? "border-[#1c1410] bg-[#1c1410] font-semibold text-white"
                      : "border-[#dbd7d2] bg-white text-[#68625e] hover:border-[#1c1410] hover:text-[#1c1410]"
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

      {/* Tile landing (category_grid layout, no category picked, no search) */}
      {showTileLanding && (
        <CategoryTileGrid categories={categories} onSelect={handlePickCategory} />
      )}

      {/* Featured products (only when not searching) */}
      {!showTileLanding && featuredProducts.length > 0 && (
        <FeaturedProducts
          products={featuredProducts}
          onProductClick={setSelectedProduct}
        />
      )}

      {/* Categories + products */}
      {!showTileLanding && (
      <div className="px-4 py-4 md:px-6">
        {filteredCategories.length === 0 && query ? (
          <div className="flex flex-col items-center gap-2.5 px-6 py-12 text-center">
            <div className="grid h-[72px] w-[72px] place-items-center rounded-full border border-[#dbd7d2] bg-[#fdf9f3]">
              <Search className="h-7 w-7 text-[#a89e94]" />
            </div>
            <p className="text-[17px] font-extrabold tracking-tight text-[#1c1410]">
              Aucun résultat
            </p>
            <p className="max-w-[24ch] text-[13px] leading-snug text-[#68625e]">
              Essayez un autre terme de recherche.
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-1 inline-flex h-9 items-center justify-center rounded-full border-[1.5px] border-[#1c1410] bg-transparent px-4 text-[11px] font-bold uppercase tracking-[0.08em] text-[#1c1410] transition-colors hover:bg-[#1c1410] hover:text-white"
            >
              Effacer
            </button>
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
      )}

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
        open={hydrated && !orderType && !browseMode}
        restaurantName={restaurantName}
        logoUrl={logoUrl}
        orderTypes={orderTypes}
        loyaltyEnabled={loyaltyEnabled}
        publicId={publicId}
      />
    </div>
  );
}
