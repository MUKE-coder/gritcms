export interface Contact {
  id: number;
  tenant_id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  avatar_url: string;
  source: string;
  ip_address: string;
  country: string;
  city: string;
  custom_fields: Record<string, unknown> | null;
  user_id: number | null;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
  activities?: ContactActivity[];
}

export interface Tag {
  id: number;
  tenant_id: number;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
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

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  total: number;
}

export interface CustomFieldDefinition {
  id: number;
  tenant_id: number;
  name: string;
  field_key: string;
  field_type: "text" | "number" | "date" | "select" | "boolean";
  options: Array<{ label: string; value: string }> | null;
  required: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
