"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  CartItem,
  CartItemModifier,
  DeliveryAddress,
  OrderType,
} from "@/lib/types";

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
  restaurantPublicId: string | null;
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
  browseMode: boolean;
  setBrowseMode: (value: boolean) => void;
  deliveryAddress: DeliveryAddress | null;
  deliveryFee: number;
  deliveryZoneId: string | null;
  deliveryMinOrder: number;
  deliveryDistanceM: number | null;
  setDelivery: (info: {
    address: DeliveryAddress | null;
    fee: number;
    zoneId: string | null;
    minOrder: number;
    distanceM: number | null;
  }) => void;
  clearDelivery: () => void;
  clearCart: () => void;
  setRestaurantPublicId: (publicId: string) => void;
  totalPrice: () => number;
  totalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      restaurantPublicId: null,
      lastAddedAt: 0,
      orderType: null,
      browseMode: false,
      deliveryAddress: null,
      deliveryFee: 0,
      deliveryZoneId: null,
      deliveryMinOrder: 0,
      deliveryDistanceM: null,

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

      setBrowseMode: (value) => set({ browseMode: value }),

      setOrderType: (type) =>
        set((state) => ({
          orderType: type,
          browseMode: false,
          ...(type !== "delivery" && {
            deliveryAddress: null,
            deliveryFee: 0,
            deliveryZoneId: null,
            deliveryMinOrder: 0,
            deliveryDistanceM: null,
          }),
          ...(type === "delivery" && state.orderType !== "delivery" && {}),
        })),

      setDelivery: ({ address, fee, zoneId, minOrder, distanceM }) =>
        set({
          deliveryAddress: address,
          deliveryFee: fee,
          deliveryZoneId: zoneId,
          deliveryMinOrder: minOrder,
          deliveryDistanceM: distanceM,
        }),

      clearDelivery: () =>
        set({
          deliveryAddress: null,
          deliveryFee: 0,
          deliveryZoneId: null,
          deliveryMinOrder: 0,
          deliveryDistanceM: null,
        }),

      clearCart: () =>
        set({
          items: [],
          deliveryAddress: null,
          deliveryFee: 0,
          deliveryZoneId: null,
          deliveryMinOrder: 0,
          deliveryDistanceM: null,
        }),

      setRestaurantPublicId: (publicId) => {
        const current = get().restaurantPublicId;
        if (current && current !== publicId) {
          // Different restaurant, clear cart and order type
          set({
            items: [],
            restaurantPublicId: publicId,
            orderType: null,
            browseMode: false,
            deliveryAddress: null,
            deliveryFee: 0,
            deliveryZoneId: null,
            deliveryMinOrder: 0,
            deliveryDistanceM: null,
          });
        } else {
          set({ restaurantPublicId: publicId });
        }
      },

      totalPrice: () => get().items.reduce((sum, i) => sum + i.line_total, 0),
      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: "taapr-cart",
    }
  )
);
