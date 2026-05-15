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
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
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
              className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition-all hover:border-foreground/40 hover:shadow-sm"
            >
              <div className="relative aspect-[4/3] w-full bg-muted">
                {cat.image_url ? (
                  <Image
                    src={cat.image_url}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 16vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Icon className="h-6 w-6 text-foreground" />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-center px-1.5 py-1.5">
                <span className="line-clamp-2 text-center text-[12px] font-bold leading-tight tracking-tight text-foreground sm:text-[13px]">
                  {cat.name}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  const handleAddProduct = (p: ProductWithModifiers) => {
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
  };

  return (
    <>
      {/* Category nav:
          - linear mode: chip strip (existing behaviour)
          - category_grid drilled-in: back arrow + section heading, no chips */}
      {isCategoryGrid ? (
        <div className="mb-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPickedCategoryId(null)}
            aria-label="Retour aux catégories"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-foreground/40"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          {activeCategory && (
            <div className="flex min-w-0 items-center gap-2">
              <h3 className="truncate text-base font-bold">
                {activeCategory.name}
              </h3>
              <span className="font-mono text-xs font-semibold text-muted-foreground">
                {activeCategory.products.length}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="no-scrollbar -mx-4 mb-3 flex items-center gap-2 overflow-x-auto px-4">
          {categories.map((cat) => {
            const isActive = activeCategory?.id === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategoryId(cat.id)}
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
      )}

      {/* Article grid:
          - category_grid drilled-in: 2-col image-on-top cards
          - linear: existing big text buttons */}
      {activeCategory && (
        isCategoryGrid ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {activeCategory.products.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleAddProduct(p)}
                className="flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition-colors hover:border-foreground/40 active:bg-muted"
              >
                {p.image_url ? (
                  <div className="relative aspect-[4/3] w-full bg-muted">
                    <Image
                      src={p.image_url}
                      alt={p.name}
                      fill
                      sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 16vw"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-[4/3] w-full bg-muted" />
                )}
                <div className="flex flex-1 flex-col gap-0.5 px-2 py-1.5">
                  <p className="line-clamp-2 text-[12px] font-bold leading-tight">
                    {p.name}
                  </p>
                  <p className="mt-auto text-[12px] font-semibold text-muted-foreground">
                    {formatPrice(p.price)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {activeCategory.products.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleAddProduct(p)}
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
        )
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
