// Database row types

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  opening_hours: Record<string, { open: string; close: string }>;
  is_accepting_orders: boolean;
  owner_id: string | null;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  restaurant_id: string;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number; // in cents
  image_url: string | null;
  category_id: string;
  is_available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ModifierGroup {
  id: string;
  name: string;
  product_id: string;
  min_select: number;
  max_select: number;
  sort_order: number;
  created_at: string;
}

export interface Modifier {
  id: string;
  name: string;
  price_extra: number; // in cents
  group_id: string;
  is_available: boolean;
  sort_order: number;
  created_at: string;
}

export type OrderStatus = "new" | "preparing" | "ready" | "done" | "cancelled";
export type PaymentMethod = "online" | "on_site";

export interface OrderCustomerInfo {
  name: string;
  phone: string;
}

export interface OrderItemModifier {
  group_name: string;
  modifier_name: string;
  price_extra: number;
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  modifiers: OrderItemModifier[];
  line_total: number;
}

export interface Order {
  id: string;
  order_number: number;
  restaurant_id: string;
  customer_info: OrderCustomerInfo;
  items: OrderItem[];
  status: OrderStatus;
  total_price: number;
  pickup_time: string | null;
  payment_method: PaymentMethod;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  paid: boolean;
  created_at: string;
  updated_at: string;
}

// Enriched types for frontend

export interface ModifierGroupWithModifiers extends ModifierGroup {
  modifiers: Modifier[];
}

export interface ProductWithModifiers extends Product {
  modifier_groups: ModifierGroupWithModifiers[];
}

export interface CategoryWithProducts extends Category {
  products: ProductWithModifiers[];
}

// Cart types

export interface CartItemModifier {
  group_id: string;
  group_name: string;
  modifier_id: string;
  modifier_name: string;
  price_extra: number;
}

export interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  base_price: number;
  quantity: number;
  modifiers: CartItemModifier[];
  line_total: number;
}
