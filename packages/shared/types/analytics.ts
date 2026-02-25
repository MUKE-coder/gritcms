import type { Contact } from "./contact";
import type { Order } from "./commerce";

export interface AnalyticsDashboard {
  total_contacts: number;
  new_contacts_30d: number;
  total_subscribers: number;
  total_revenue: number;
  monthly_revenue: number;
  total_orders: number;
  mrr: number;
  active_students: number;
  completed_courses: number;
  total_emails_sent: number;
  total_campaigns: number;
  recent_contacts: Contact[];
  recent_orders: Order[];
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface SubscriberGrowthPoint {
  date: string;
  new_subscribers: number;
  new_contacts: number;
}

export interface ProductStat {
  product_id: number;
  name: string;
  sales: number;
  revenue: number;
}

export interface ContactProfile {
  contact: Contact;
  subscriptions: unknown[];
  enrollments: unknown[];
  orders: Order[];
  lifetime_value: number;
  active_subs: unknown[];
  certificates: unknown[];
  activities: ContactActivity[];
}

export interface ContactActivity {
  id: number;
  tenant_id: number;
  contact_id: number;
  module: string;
  action: string;
  details: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
