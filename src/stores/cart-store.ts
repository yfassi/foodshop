"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, CartItemModifier, OrderType } from "@/lib/types";

function computeLineTotal(
  basePrice: number,
  modifiers: CartItemModifier[],
  quantity: number,
  menuSupplement: number = 0
): number {
  const modifiersTotal = modifiers.reduce((sum, m) => sum + m.price_extra, 0);
  return (basePrice + menuSupplement + modifiersTotal) * quantity;
}

interface CartState {
  items: CartItem[];
  restaurantSlug: string | null;
  lastAddedAt: number;

  addItem: (item: {
    product_id: string;
    product_name: string;
    base_price: number;
    quantity: number;
    modifiers: CartItemModifier[];
    is_menu: boolean;
    menu_supplement: number;
  }) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  orderType: OrderType | null;
  setOrderType: (type: OrderType) => void;
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
      lastAddedAt: 0,
      orderType: null,

      addItem: (item) => {
        const lineTotal = computeLineTotal(
          item.base_price,
          item.modifiers,
          item.quantity,
          item.is_menu ? item.menu_supplement : 0
        );
        const cartItem: CartItem = {
          ...item,
          id: crypto.randomUUID(),
          line_total: lineTotal,
        };
        set((state) => ({ items: [...state.items, cartItem], lastAddedAt: Date.now() }));
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
                    quantity,
                    item.is_menu ? item.menu_supplement : 0
                  ),
                }
              : item
          ),
        }));
      },

      setOrderType: (type) => set({ orderType: type }),

      clearCart: () => set({ items: [] }),

      setRestaurantSlug: (slug) => {
        const current = get().restaurantSlug;
        if (current && current !== slug) {
          // Different restaurant, clear cart and order type
          set({ items: [], restaurantSlug: slug, orderType: null });
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
