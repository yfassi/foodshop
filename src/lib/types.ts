// Database row types

export type AcceptedPaymentMethod = "online" | "on_site";
export type PaymentSource = "direct" | "wallet";
export type OrderType = "dine_in" | "takeaway" | "delivery";
export type SubscriptionTier = "plat" | "menu" | "carte";

export type DeliveryStatus =
  | "pending"
  | "assigned"
  | "picked_up"
  | "delivered"
  | "failed";

export interface DeliveryZone {
  id: string;
  label: string;
  radius_m: number;   // rayon externe en mètres depuis les coords du resto
  fee: number;        // centimes
  min_order: number;  // centimes, 0 = pas de minimum
}

export interface DeliveryCoords {
  lat: number;
  lng: number;
}

export interface DeliveryConfig {
  coords?: DeliveryCoords;
  prep_time_minutes?: number;
  max_radius_m?: number;
  zones?: DeliveryZone[];
}

export interface DeliveryAddress {
  lat: number;
  lng: number;
  formatted: string;
  street?: string;
  city?: string;
  postal_code?: string;
  floor_notes?: string;
}

export interface Driver {
  id: string;
  user_id: string | null;
  restaurant_id: string;
  full_name: string;
  phone: string;
  is_active: boolean;
  vehicle: string | null;
  invited_at: string;
  first_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyTier {
  id: string;
  points: number;
  reward_type: "free_product" | "discount";
  product_id?: string;
  product_name?: string;
  discount_amount?: number;
  label: string;
}

export interface WalletTopupTier {
  id: string;
  amount: number;  // montant payé en centimes (ex: 2000 = 20€)
  bonus: number;   // bonus offert en centimes (ex: 500 = 5€)
  label: string;   // "Populaire", "Meilleure offre"...
}

export type VerificationStatus = "pending" | "verified" | "rejected";

export interface FloorPlanTable {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: "rect" | "circle";
  seats: number;
}

export interface FloorPlan {
  tables?: FloorPlanTable[];
  grid?: { cols: number; rows: number };
  updated_at?: string;
}

export interface ApiKey {
  id: string;
  restaurant_id: string;
  name: string;
  prefix: string;
  scopes: string[];
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export type RestaurantAdminRole = "owner" | "manager";

export interface RestaurantAdmin {
  id: string;
  restaurant_id: string;
  user_id: string;
  role: RestaurantAdminRole;
  created_at: string;
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
  is_active: boolean;
  owner_id: string | null;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  stripe_customer_id: string | null;
  accepted_payment_methods: AcceptedPaymentMethod[];
  order_types: OrderType[];
  loyalty_enabled: boolean;
  loyalty_tiers: LoyaltyTier[];
  wallet_topup_enabled: boolean;
  wallet_topup_tiers: WalletTopupTier[];
  queue_enabled: boolean;
  queue_max_concurrent: number;
  verification_status: VerificationStatus;
  verification_document_url: string | null;
  subscription_tier: SubscriptionTier;
  delivery_addon_active: boolean;
  delivery_enabled: boolean;
  delivery_config: DeliveryConfig;
  stock_module_active: boolean;
  stock_enabled: boolean;
  stock_config: StockConfig;
  stock_stripe_subscription_id: string | null;
  stock_subscription_status: string | null;
  floor_plan: FloorPlan;
  created_at: string;
  updated_at: string;
}

export type QueueTicketStatus = "waiting" | "active" | "completed" | "expired";

export interface QueueTicket {
  id: string;
  restaurant_id: string;
  customer_session_id: string;
  customer_user_id: string | null;
  status: QueueTicketStatus;
  position: number;
  called_at: string | null;
  expires_at: string | null;
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
  delivery_status: DeliveryStatus | null;
  delivery_address: DeliveryAddress | null;
  delivery_fee: number | null;
  delivery_zone_id: string | null;
  driver_id: string | null;
  assigned_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  delivery_tip: number;
  delivery_distance_m: number | null;
  created_at: string;
  updated_at: string;
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

// ============================================
// STOCK MODULE
// ============================================

export type IngredientUnit = "kg" | "g" | "l" | "ml" | "piece";

export interface StockConfig {
  default_low_threshold_pct?: number;
  alert_hour_local?: number;
  alert_push_enabled?: boolean;
}

export interface Supplier {
  id: string;
  restaurant_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ingredient {
  id: string;
  restaurant_id: string;
  supplier_id: string | null;
  name: string;
  category: string | null;
  unit: IngredientUnit;
  current_qty: number;
  low_threshold: number;
  cost_per_unit_cents: number | null;
  created_at: string;
  updated_at: string;
}

export interface Recipe {
  id: string;
  product_id: string;
  restaurant_id: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecipeItem {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  quantity: number;
  created_at: string;
}

export type StockMovementReason =
  | "scan_in"
  | "order_consumption"
  | "manual_adjust"
  | "loss"
  | "opening";

export interface StockMovement {
  id: string;
  restaurant_id: string;
  ingredient_id: string;
  delta: number;
  reason: StockMovementReason;
  order_id: string | null;
  delivery_scan_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export type DeliveryScanStatus = "pending" | "validated" | "discarded";

export interface ParsedScanLine {
  name: string;
  qty: number;
  unit: IngredientUnit | null;
  price_cents: number | null;
  ingredient_id?: string | null;
}

export interface DeliveryScan {
  id: string;
  restaurant_id: string;
  supplier_id: string | null;
  image_url: string | null;
  ocr_raw: string | null;
  parsed_items: ParsedScanLine[];
  status: DeliveryScanStatus;
  total_cents: number | null;
  scan_date: string;
  validated_at: string | null;
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
