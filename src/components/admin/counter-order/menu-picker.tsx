"use client";

import { useState } from "react";
import Image from "next/image";
import type {
  CategoryWithProducts,
  ProductWithModifiers,
  CartItem,
} from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { ImageIcon } from "lucide-react";
import { ModifierPicker } from "./modifier-picker";

interface MenuPickerProps {
  categories: CategoryWithProducts[];
  onAddItem: (item: CartItem) => void;
}

export function MenuPicker({ categories, onAddItem }: MenuPickerProps) {
  const [selectedProduct, setSelectedProduct] =
    useState<ProductWithModifiers | null>(null);

  if (categories.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-xs text-muted-foreground">
        Aucun article disponible. Ajoutez des produits dans Articles.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {categories.map((cat) => (
          <section key={cat.id}>
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {cat.name}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {cat.products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    if (p.modifier_groups.length === 0 && p.menu_supplement == null) {
                      // No options to pick — add directly
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
                  className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-colors hover:border-foreground/40"
                >
                  <div className="relative h-24 w-full bg-muted">
                    {p.image_url ? (
                      <Image
                        src={p.image_url}
                        alt={p.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, 200px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="truncate text-xs font-semibold">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatPrice(p.price)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

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
