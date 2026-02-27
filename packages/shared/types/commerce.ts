import type { Contact } from "./contact";

// --- Products ---

export type ProductType = "digital" | "physical" | "course" | "membership" | "service";
export type ProductStatus = "active" | "inactive" | "archived";

export interface Product {
  id: number;
  tenant_id: number;
  name: string;
  slug: string;
  description: string;
  type: ProductType;
  status: ProductStatus;
  images: string[] | null;
  downloadable_files: Array<{ name: string; url: string }> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  prices?: Price[];
  variants?: ProductVariant[];
  sales_count?: number;
}

// --- Prices ---

export type PriceType = "one_time" | "subscription";
export type PriceInterval = "month" | "year";

export interface Price {
  id: number;
  tenant_id: number;
  product_id: number;
  amount: number;
  currency: string;
  type: PriceType;
  interval: PriceInterval | "";
  trial_days: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// --- Product Variants ---

export interface ProductVariant {
  id: number;
  tenant_id: number;
  product_id: number;
  name: string;
  sku: string;
  price_override: number | null;
  stock_quantity: number | null;
  attributes: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

// --- Orders ---

export type OrderStatus = "pending" | "paid" | "failed" | "refunded" | "partially_refunded";

export interface Order {
  id: number;
  tenant_id: number;
  contact_id: number;
  order_number: string;
  status: OrderStatus;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  currency: string;
  payment_provider: string;
  payment_id: string;
  coupon_id: number | null;
  metadata: Record<string, unknown> | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  contact?: Contact;
  items?: OrderItem[];
  coupon?: Coupon;
}

// --- Order Items ---

export interface OrderItem {
  id: number;
  tenant_id: number;
  order_id: number;
  product_id: number;
  price_id: number | null;
  variant_id: number | null;
  quantity: number;
  unit_price: number;
  total: number;
  created_at: string;
  product?: Product;
}

// --- Coupons ---

export type CouponType = "percentage" | "fixed";
export type CouponStatus = "active" | "expired" | "disabled";

export interface Coupon {
  id: number;
  tenant_id: number;
  code: string;
  type: CouponType;
  amount: number;
  min_order_amount: number;
  max_uses: number;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  product_ids: number[] | null;
  status: CouponStatus;
  created_at: string;
  updated_at: string;
}

// --- Subscriptions ---

export type SubStatus = "active" | "past_due" | "cancelled" | "paused";

export interface Subscription {
  id: number;
  tenant_id: number;
  contact_id: number;
  product_id: number;
  price_id: number;
  status: SubStatus;
  payment_provider: string;
  provider_subscription_id: string;
  current_period_start: string;
  current_period_end: string;
  cancelled_at: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
  contact?: Contact;
  product?: Product;
  price?: Price;
}

// --- Checkout ---

export interface CheckoutRequest {
  type: "product" | "course";
  product_id?: number;
  course_id?: number;
  price_id?: number;
  coupon_code?: string;
}

export interface CheckoutResponse {
  client_secret: string;
  order_id: number;
  order_number: string;
  amount: number;
  currency: string;
  publishable_key: string;
}

export interface CheckoutStatus {
  order_id: number;
  order_number: string;
  status: string;
  total: number;
}

// --- Revenue Dashboard ---

export interface RevenueDashboard {
  total_revenue: number;
  total_orders: number;
  total_products: number;
  active_subscriptions: number;
  monthly_revenue: number;
  mrr: number;
  recent_orders: Order[];
}
