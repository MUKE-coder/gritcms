export type FunnelStatus = "draft" | "active" | "archived";
export type FunnelType = "optin" | "sales" | "webinar" | "launch";
export type StepType = "landing" | "sales" | "checkout" | "upsell" | "downsell" | "thankyou";

export interface Funnel {
  id: number;
  tenant_id: number;
  name: string;
  slug: string;
  description: string;
  status: FunnelStatus;
  type: FunnelType;
  created_at: string;
  updated_at: string;
  steps?: FunnelStep[];
  visit_count?: number;
  conversion_count?: number;
}

export interface FunnelStep {
  id: number;
  tenant_id: number;
  funnel_id: number;
  name: string;
  slug: string;
  type: StepType;
  content: unknown;
  sort_order: number;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FunnelVisit {
  id: number;
  funnel_id: number;
  step_id: number;
  contact_id: number | null;
  ip_address: string;
  user_agent: string;
  referrer: string;
  visited_at: string;
}

export interface FunnelConversion {
  id: number;
  funnel_id: number;
  step_id: number;
  contact_id: number | null;
  type: string;
  value: number;
  converted_at: string;
}

export interface FunnelAnalytics {
  total_visits: number;
  total_conversions: number;
  total_value: number;
  overall_rate: number;
  steps: StepStats[];
}

export interface StepStats {
  step_id: number;
  step_name: string;
  step_type: string;
  visits: number;
  conversions: number;
  conversion_rate: number;
}
