"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type { CategoryWithProducts, MenuLayout, ProductWithModifiers } from "@/lib/types";
import { CategorySection } from "./category-section";
import { CategoryTileGrid } from "./category-grid";
import { FeaturedProducts } from "./featured-products";
import { FloatingCartButton } from "@/components/cart/floating-cart-button";
import { ModifierModal } from "./modifier-modal";
import { ProductCardSmall } from "./product-card-small";
import { useCartStore } from "@/stores/cart-store";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { isCurrentlyOpen } from "@/lib/constants";
import { getCategoryIcon } from "@/lib/category-icons";
import { ArrowLeft, Search, X } from "lucide-react";
import { WelcomeModal } from "./welcome-modal";
import type { OrderType } from "@/lib/types";

const NOUVEAUTES_NAME = "nouveautés";

function isNouveautes(category: { name: string }) {
  return category.name.trim().toLowerCase() === NOUVEAUTES_NAME;
}

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

  // The "Nouveautés" pinned-at-top horizontal scroll: visible whenever the
  // user is on an initial view (no search, not drilled-in inside grid mode).
  const nouveautesCategory = categories.find(isNouveautes) ?? null;
  const isInitialView = !query && (!isCategoryGrid || !pickedCategoryId);

  // In category_grid + drilled-in mode without a search, show only the picked
  // category. Search overrides the picked category and falls back to all
  // matching categories.
  const filteredCategories =
    isCategoryGrid && pickedCategoryId && !query
      ? searchedCategories.filter((c) => c.id === pickedCategoryId)
      : searchedCategories;

  // In linear mode we render Nouveautés as a pinned horizontal scroll above
  // the rest of the menu, so we strip it from the body to avoid duplication.
  // Search results keep Nouveautés inline so the user sees matching products
  // grouped by category.
  const bodyCategories =
    isInitialView && !isCategoryGrid
      ? filteredCategories.filter((c) => !isNouveautes(c))
      : filteredCategories;

  // Tile grid excludes Nouveautés (already pinned at top).
  const tileCategories = categories.filter((c) => !isNouveautes(c));

  // Picked category in drilled-in mode (only one).
  const drilledCategory =
    isCategoryGrid && pickedCategoryId && !query
      ? filteredCategories[0] ?? null
      : null;
  const DrilledIcon = drilledCategory ? getCategoryIcon(drilledCategory.icon) : null;

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

        {/* Category pills:
            - linear mode (no search): inline scroll-snap nav
            - category_grid landing: hidden (tiles do the navigation)
            - category_grid drilled-in: hidden (use the back button) */}
        {!query && !isCategoryGrid && (
          <ScrollArea className="w-full">
            <div className="flex gap-1.5 px-4 py-2.5">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  ref={(el) => {
                    if (el) chipRefs.current.set(cat.id, el);
                  }}
                  onClick={() => scrollToCategory(cat.id)}
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

      {/* Pinned Nouveautés horizontal scroll — always at top of an initial view */}
      {isInitialView &&
        nouveautesCategory &&
        nouveautesCategory.products.length > 0 && (
          <div className="px-4 pt-4 md:px-6">
            <CategorySection category={nouveautesCategory} horizontal />
          </div>
        )}

      {/* Tile landing (category_grid layout, no category picked, no search).
          Nouveautés is excluded — it's pinned above as a horizontal scroll. */}
      {showTileLanding && (
        <CategoryTileGrid categories={tileCategories} onSelect={handlePickCategory} />
      )}

      {/* Featured products (linear mode, not searching) */}
      {!showTileLanding && featuredProducts.length > 0 && (
        <FeaturedProducts
          products={featuredProducts}
          onProductClick={setSelectedProduct}
        />
      )}

      {/* category_grid drilled-in: 2-col image-on-top card grid for the picked category */}
      {!showTileLanding && drilledCategory && (
        <div className="px-4 py-4 md:px-6">
          <div className="mb-3 flex items-center gap-2">
            {DrilledIcon && (
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#fdf9f3] text-[#68625e]">
                <DrilledIcon className="h-3.5 w-3.5" />
              </span>
            )}
            <h2 className="text-[15px] font-extrabold tracking-[-0.02em] text-[#1c1410]">
              {drilledCategory.name}
            </h2>
            <span className="ml-1 font-mono text-[11px] font-semibold text-[#a89e94]">
              {drilledCategory.products.length}
            </span>
          </div>
          {drilledCategory.products.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#dbd7d2] bg-[#fdf9f3] px-4 py-6 text-center text-[13px] text-[#68625e]">
              Aucun article disponible.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {drilledCategory.products.map((product) => (
                <ProductCardSmall key={product.id} product={product} fullWidth />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Linear / search results body */}
      {!showTileLanding && !drilledCategory && (
        <div className="px-4 py-4 md:px-6">
          {bodyCategories.length === 0 && query ? (
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
            bodyCategories.map((category) => (
              <CategorySection
                key={category.id}
                category={category}
                horizontal={isNouveautes(category)}
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
