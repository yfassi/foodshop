"use client";

import { useCartStore } from "@/stores/cart-store";
import { formatPrice } from "@/lib/format";
import type { CategoryWithProducts, CategoryType } from "@/lib/types";
import { Plus } from "lucide-react";
import Image from "next/image";

interface CartSuggestionsProps {
  categories: CategoryWithProducts[];
  label?: string;
}

export function CartSuggestions({ categories, label = "Compléter votre repas" }: CartSuggestionsProps) {
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);

  if (items.length === 0) return null;

  // Determine which category types are already in the cart
  const cartProductIds = new Set(items.map((i) => i.product_id));
  const cartCategoryTypes = new Set<CategoryType>();

  for (const cat of categories) {
    for (const product of cat.products) {
      if (cartProductIds.has(product.id)) {
        cartCategoryTypes.add(cat.category_type);
      }
    }
  }

  // Only suggest if cart has "main" or "side" but missing "drink" or "dessert"
  const hasMainOrSide = cartCategoryTypes.has("main") || cartCategoryTypes.has("side");
  if (!hasMainOrSide) return null;

  const missingTypes = new Set<CategoryType>();
  if (!cartCategoryTypes.has("drink")) missingTypes.add("drink");
  if (!cartCategoryTypes.has("dessert")) missingTypes.add("dessert");

  if (missingTypes.size === 0) return null;

  // Get suggestion products from missing categories (max 4)
  const suggestions = categories
    .filter((cat) => missingTypes.has(cat.category_type))
    .flatMap((cat) =>
      cat.products
        .filter((p) => p.is_available && !cartProductIds.has(p.id))
        .map((p) => ({
          ...p,
          // Check if product has required modifiers
          hasRequiredModifiers: p.modifier_groups.some((g) => g.min_select > 0),
        }))
    )
    .slice(0, 4);

  if (suggestions.length === 0) return null;

  const handleQuickAdd = (product: typeof suggestions[0]) => {
    if (product.hasRequiredModifiers) return; // Can't quick-add products with required modifiers

    addItem({
      product_id: product.id,
      product_name: product.name,
      base_price: product.price,
      quantity: 1,
      modifiers: [],
      is_menu: false,
      menu_supplement: 0,
    });
  };

  return (
    <div className="py-3">
      <p className="mb-2.5 text-xs font-semibold text-muted-foreground">{label}</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {suggestions.map((product) => (
          <button
            key={product.id}
            onClick={() => handleQuickAdd(product)}
            disabled={product.hasRequiredModifiers}
            className="flex shrink-0 items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2 text-left transition-all hover:border-primary/50 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {product.image_url && (
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                <Image
                  src={product.image_url}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{product.name}</p>
              <p className="text-xs font-semibold text-primary">{formatPrice(product.price)}</p>
            </div>
            {!product.hasRequiredModifiers && (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Plus className="h-3 w-3" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
