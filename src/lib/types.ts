// Database row types

export type AcceptedPaymentMethod = "online" | "on_site";
export type PaymentSource = "direct" | "wallet";
export type OrderType = "dine_in" | "takeaway";

export interface LoyaltyTier {
  id: string;
  points: number;
  reward_type: "free_product" | "discount";
  product_id?: string;
  product_name?: string;
  discount_amount?: number;
  label: string;
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  restaurant_type: string | null;
  siret: string | null;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  opening_hours: Record<string, { open: string; close: string }[]>;
  is_accepting_orders: boolean;
  owner_id: string | null;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  accepted_payment_methods: AcceptedPaymentMethod[];
  order_types: OrderType[];
  loyalty_enabled: boolean;
  loyalty_tiers: LoyaltyTier[];
  created_at: string;
  updated_at: string;
}

export type CategoryType = "main" | "drink" | "dessert" | "side" | "other";

export interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  restaurant_id: string;
  sort_order: number;
  is_visible: boolean;
  category_type: CategoryType;
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
  is_featured: boolean;
  sort_order: number;
  menu_supplement: number | null;
  menu_description: string | null;
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
export type OrderView = "comptoir" | "cuisine";

export interface OrderCustomerInfo {
  name?: string;
  phone?: string;
  notes?: string;
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
  is_menu?: boolean;
  menu_supplement?: number;
}

export interface Order {
  id: string;
  order_number: number;
  display_order_number: string | null;
  restaurant_id: string;
  customer_info: OrderCustomerInfo;
  items: OrderItem[];
  status: OrderStatus;
  total_price: number;
  pickup_time: string | null;
  payment_method: PaymentMethod;
  order_type: OrderType | null;
  payment_source: PaymentSource;
  customer_user_id: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  paid: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuChoiceGroup {
  id: string;
  product_id: string;
  name: string;
  min_select: number;
  max_select: number;
  sort_order: number;
  created_at: string;
}

export interface MenuChoiceItem {
  id: string;
  group_id: string;
  product_id: string;
  sort_order: number;
  created_at: string;
}

export interface SharedModifierGroup {
  id: string;
  restaurant_id: string;
  name: string;
  min_select: number;
  max_select: number;
  sort_order: number;
  created_at: string;
}

export interface SharedModifier {
  id: string;
  group_id: string;
  name: string;
  price_extra: number;
  is_available: boolean;
  sort_order: number;
  created_at: string;
}

// Enriched types for frontend

export interface ModifierGroupWithModifiers extends ModifierGroup {
  modifiers: Modifier[];
}

export interface ProductWithModifiers extends Product {
  modifier_groups: ModifierGroupWithModifiers[];
}

export interface SharedModifierGroupWithModifiers extends SharedModifierGroup {
  shared_modifiers: SharedModifier[];
}

export interface CategoryWithProducts extends Category {
  products: ProductWithModifiers[];
}

// Customer & Wallet types

export interface CustomerProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  restaurant_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export type WalletTxType = "topup_stripe" | "topup_admin" | "payment" | "refund";

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  type: WalletTxType;
  amount: number;
  balance_after: number;
  description: string | null;
  order_id: string | null;
  stripe_session_id: string | null;
  created_by: string | null;
  created_at: string;
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
  is_menu: boolean;
  menu_supplement: number;
}
