"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type {
  CategoryWithProducts,
  MenuLayout,
  ProductWithModifiers,
  CartItem,
} from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { ModifierPicker } from "./modifier-picker";
import { getCategoryIcon } from "@/lib/category-icons";
import { ArrowLeft } from "lucide-react";

interface MenuPickerProps {
  categories: CategoryWithProducts[];
  onAddItem: (item: CartItem) => void;
  menuLayout?: MenuLayout;
}

export function MenuPicker({ categories, onAddItem, menuLayout = "linear" }: MenuPickerProps) {
  const [selectedProduct, setSelectedProduct] =
    useState<ProductWithModifiers | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string>(
    categories[0]?.id ?? ""
  );
  // category_grid landing state — null means "show tile grid".
  const [pickedCategoryId, setPickedCategoryId] = useState<string | null>(null);
  const isCategoryGrid = menuLayout === "category_grid";
  const showTileLanding = isCategoryGrid && pickedCategoryId === null;

  const activeCategory = useMemo(() => {
    const id = isCategoryGrid ? pickedCategoryId ?? activeCategoryId : activeCategoryId;
    return categories.find((c) => c.id === id) ?? categories[0] ?? null;
  }, [categories, activeCategoryId, pickedCategoryId, isCategoryGrid]);

  if (categories.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-xs text-muted-foreground">
        Aucun article disponible. Ajoutez des produits dans Articles.
      </p>
    );
  }

  if (showTileLanding) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {categories.map((cat) => {
          const Icon = getCategoryIcon(cat.icon);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setPickedCategoryId(cat.id);
                setActiveCategoryId(cat.id);
              }}
              className="group relative flex aspect-[5/3] flex-col items-center justify-center overflow-hidden rounded-xl border border-border bg-card px-3 py-4 text-center transition-all hover:border-foreground/40 hover:shadow-sm"
            >
              {cat.image_url ? (
                <Image
                  src={cat.image_url}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 50vw, 33vw"
                  className="absolute inset-0 object-cover opacity-90"
                />
              ) : (
                <span className="mb-2 grid h-10 w-10 place-items-center rounded-full bg-muted text-foreground">
                  <Icon className="h-5 w-5" />
                </span>
              )}
              <span
                className={
                  cat.image_url
                    ? "relative z-10 rounded-full bg-background/95 px-3 py-1 text-sm font-bold tracking-tight text-foreground shadow-sm"
                    : "text-sm font-bold tracking-tight text-foreground sm:text-base"
                }
              >
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <>
      {/* Horizontal scrollable categories (with back button in category_grid mode) */}
      <div className="no-scrollbar -mx-4 mb-3 flex items-center gap-2 overflow-x-auto px-4">
        {isCategoryGrid && (
          <button
            type="button"
            onClick={() => setPickedCategoryId(null)}
            aria-label="Retour aux catégories"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-foreground/40"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        {categories.map((cat) => {
          const isActive = activeCategory?.id === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCategoryId(cat.id);
                if (isCategoryGrid) setPickedCategoryId(cat.id);
              }}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Big article buttons — no images, name in large text */}
      {activeCategory && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {activeCategory.products.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                if (p.modifier_groups.length === 0 && p.menu_supplement == null) {
                  onAddItem({
                    id: crypto.randomUUID(),
                    product_id: p.id,
                    product_name: p.name,
                    base_price: p.price,
                    quantity: 1,
                    modifiers: [],
                    line_total: p.price,
                    is_menu: false,
                    menu_supplement: 0,
                  });
                } else {
                  setSelectedProduct(p);
                }
              }}
              className="flex min-h-[88px] flex-col items-start justify-between gap-1 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-foreground/40 active:bg-muted"
            >
              <p className="line-clamp-2 text-base font-bold leading-tight">
                {p.name}
              </p>
              <p className="text-sm font-medium text-muted-foreground">
                {formatPrice(p.price)}
              </p>
            </button>
          ))}
        </div>
      )}

      {selectedProduct && (
        <ModifierPicker
          open={!!selectedProduct}
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAdd={(item) => {
            onAddItem(item);
            setSelectedProduct(null);
          }}
        />
      )}
    </>
  );
}
