"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, CartItemModifier } from "@/lib/types";

function computeLineTotal(
  basePrice: number,
  modifiers: CartItemModifier[],
  quantity: number
): number {
  const modifiersTotal = modifiers.reduce((sum, m) => sum + m.price_extra, 0);
  return (basePrice + modifiersTotal) * quantity;
}

interface CartState {
  items: CartItem[];
  restaurantSlug: string | null;

  addItem: (item: {
    product_id: string;
    product_name: string;
    base_price: number;
    quantity: number;
    modifiers: CartItemModifier[];
  }) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  setRestaurantSlug: (slug: string) => void;
  totalPrice: () => number;
  totalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      restaurantSlug: null,

      addItem: (item) => {
        const lineTotal = computeLineTotal(
          item.base_price,
          item.modifiers,
          item.quantity
        );
        const cartItem: CartItem = {
          ...item,
          id: crypto.randomUUID(),
          line_total: lineTotal,
        };
        set((state) => ({ items: [...state.items, cartItem] }));
      },

      removeItem: (cartItemId) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== cartItemId),
        }));
      },

      updateQuantity: (cartItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(cartItemId);
          return;
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.id === cartItemId
              ? {
                  ...item,
                  quantity,
                  line_total: computeLineTotal(
                    item.base_price,
                    item.modifiers,
                    quantity
                  ),
                }
              : item
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      setRestaurantSlug: (slug) => {
        const current = get().restaurantSlug;
        if (current && current !== slug) {
          // Different restaurant, clear cart
          set({ items: [], restaurantSlug: slug });
        } else {
          set({ restaurantSlug: slug });
        }
      },

      totalPrice: () => get().items.reduce((sum, i) => sum + i.line_total, 0),
      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: "foodshop-cart",
    }
  )
);
