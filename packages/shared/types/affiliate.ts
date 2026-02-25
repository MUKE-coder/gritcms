export type AffiliateAccountStatus = "pending" | "active" | "suspended";
export type CommissionStatus = "pending" | "approved" | "paid" | "rejected";
export type PayoutStatus = "pending" | "processing" | "completed";

export interface AffiliateProgram {
  id: number;
  tenant_id: number;
  name: string;
  description: string;
  commission_type: "percentage" | "fixed";
  commission_amount: number;
  cookie_days: number;
  min_payout_amount: number;
  auto_approve: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  account_count?: number;
}

export interface AffiliateAccount {
  id: number;
  tenant_id: number;
  contact_id: number;
  program_id: number;
  status: AffiliateAccountStatus;
  referral_code: string;
  custom_slug: string;
  balance: number;
  total_earned: number;
  total_paid: number;
  created_at: string;
  updated_at: string;
  contact?: { id: number; first_name: string; last_name: string; email: string; avatar_url: string };
  program?: AffiliateProgram;
  links?: AffiliateLink[];
  commissions?: Commission[];
}

export interface AffiliateLink {
  id: number;
  account_id: number;
  url: string;
  slug: string;
  clicks: number;
  conversions: number;
  created_at: string;
}

export interface Commission {
  id: number;
  account_id: number;
  order_id: number | null;
  product_id: number | null;
  amount: number;
  status: CommissionStatus;
  approved_at: string | null;
  paid_at: string | null;
  created_at: string;
  account?: AffiliateAccount;
}

export interface Payout {
  id: number;
  account_id: number;
  amount: number;
  method: string;
  status: PayoutStatus;
  processed_at: string | null;
  transaction_id: string;
  created_at: string;
  account?: AffiliateAccount;
}

export interface AffiliateDashboard {
  total_affiliates: number;
  active_affiliates: number;
  pending_commissions: number;
  total_commission: number;
  total_paid: number;
  top_affiliates: { account_id: number; name: string; total_earned: number; conversions: number }[];
}
