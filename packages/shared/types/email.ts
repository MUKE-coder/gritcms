import type { Contact } from "./contact";

// --- Email Lists ---

export interface EmailList {
  id: number;
  tenant_id: number;
  name: string;
  description: string;
  double_optin: boolean;
  welcome_email_id: number | null;
  created_at: string;
  updated_at: string;
  welcome_email?: EmailTemplate;
  subscriber_count?: number;
}

// --- Email Subscriptions ---

export type SubscriptionStatus = "active" | "unsubscribed" | "bounced" | "complained" | "pending";

export interface EmailSubscription {
  id: number;
  tenant_id: number;
  contact_id: number;
  email_list_id: number;
  status: SubscriptionStatus;
  source: string;
  ip_address: string;
  subscribed_at: string | null;
  unsubscribed_at: string | null;
  created_at: string;
  updated_at: string;
  contact?: Contact;
  email_list?: EmailList;
}

// --- Email Templates ---

export type EmailTemplateType = "campaign" | "sequence" | "transactional";

export interface EmailTemplate {
  id: number;
  tenant_id: number;
  name: string;
  subject: string;
  html_content: string;
  text_content: string;
  type: EmailTemplateType;
  thumbnail: string;
  created_at: string;
  updated_at: string;
}

// --- Email Campaigns ---

export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "cancelled";

export interface CampaignStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
}

export interface EmailCampaign {
  id: number;
  tenant_id: number;
  name: string;
  subject: string;
  template_id: number | null;
  from_name: string;
  from_email: string;
  reply_to: string;
  html_content: string;
  text_content: string;
  list_ids: number[] | null;
  segment_ids: number[] | null;
  tag_ids: number[] | null;
  status: CampaignStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  stats: CampaignStats | null;
  created_at: string;
  updated_at: string;
  template?: EmailTemplate;
}

// --- Email Sends ---

export type SendStatus = "queued" | "sent" | "delivered" | "opened" | "clicked" | "bounced" | "failed";

export interface EmailSend {
  id: number;
  tenant_id: number;
  contact_id: number;
  campaign_id: number | null;
  sequence_step_id: number | null;
  subject: string;
  status: SendStatus;
  external_id: string;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
  contact?: Contact;
  campaign?: EmailCampaign;
}

// --- Email Sequences ---

export type SequenceStatus = "active" | "paused" | "draft";
export type SequenceTrigger = "manual" | "event";

export interface EmailSequence {
  id: number;
  tenant_id: number;
  name: string;
  description: string;
  trigger: SequenceTrigger;
  trigger_event: string;
  status: SequenceStatus;
  created_at: string;
  updated_at: string;
  steps?: EmailSequenceStep[];
  enrollments?: EmailSequenceEnrollment[];
}

export interface EmailSequenceStep {
  id: number;
  tenant_id: number;
  sequence_id: number;
  template_id: number | null;
  subject: string;
  html_content: string;
  text_content: string;
  delay_days: number;
  delay_hours: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  template?: EmailTemplate;
}

// --- Email Sequence Enrollments ---

export type EnrollmentStatus = "active" | "completed" | "cancelled";

export interface EmailSequenceEnrollment {
  id: number;
  tenant_id: number;
  sequence_id: number;
  contact_id: number;
  current_step_id: number | null;
  status: EnrollmentStatus;
  enrolled_at: string;
  completed_at: string | null;
  next_send_at: string | null;
  created_at: string;
  updated_at: string;
  sequence?: EmailSequence;
  contact?: Contact;
  current_step?: EmailSequenceStep;
}

// --- Segments ---

export type SegmentType = "static" | "dynamic";

export interface SegmentRule {
  field: string;
  operator: string;
  value: string;
}

export interface SegmentRuleGroup {
  operator: "and" | "or";
  rules: SegmentRule[];
}

export interface Segment {
  id: number;
  tenant_id: number;
  name: string;
  rules: SegmentRuleGroup | null;
  type: SegmentType;
  created_at: string;
  updated_at: string;
  match_count?: number;
}

// --- Dashboard Stats ---

export interface EmailDashboardStats {
  total_subscribers: number;
  total_lists: number;
  total_campaigns: number;
  total_sent: number;
  new_subscribers_30d: number;
}
