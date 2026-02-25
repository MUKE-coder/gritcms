// Resource Definition Types — The foundation of Grit Admin Panel
// Define resources with defineResource() and get full CRUD pages automatically.

// ─── Column Definitions ─────────────────────────────────────────────

export type ColumnFormat = "text" | "badge" | "currency" | "date" | "relative" | "boolean" | "image" | "video" | "link" | "email" | "color" | "richtext";

export interface BadgeConfig {
  [value: string]: { color: string; label: string };
}

export interface ColumnDefinition {
  key: string;
  label: string;
  sortable?: boolean;
  searchable?: boolean;
  hidden?: boolean;
  width?: string;
  format?: ColumnFormat;
  badge?: BadgeConfig;
  currencyPrefix?: string;
  className?: string;
}

// ─── Filter Definitions ─────────────────────────────────────────────

export type FilterType = "select" | "date-range" | "number-range" | "boolean";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterDefinition {
  key: string;
  label: string;
  type: FilterType;
  options?: FilterOption[];
  placeholder?: string;
}

// ─── Table Definitions ──────────────────────────────────────────────

export type TableAction = "create" | "view" | "edit" | "delete" | "export";
export type BulkAction = "delete" | "export";

export interface TableDefinition {
  columns: ColumnDefinition[];
  filters?: FilterDefinition[];
  searchable?: boolean;
  searchPlaceholder?: string;
  actions?: TableAction[];
  bulkActions?: BulkAction[];
  defaultSort?: { key: string; direction: "asc" | "desc" };
  pageSize?: number;
}

// ─── Form Field Definitions ─────────────────────────────────────────

export type FieldType = "text" | "textarea" | "number" | "select" | "date" | "datetime" | "toggle" | "checkbox" | "radio" | "image" | "images" | "video" | "videos" | "file" | "files" | "relationship-select" | "multi-relationship-select";

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  description?: string;
  defaultValue?: unknown;
  options?: FilterOption[];
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  rows?: number;
  colSpan?: 1 | 2;
  accept?: string;
  maxSize?: number;
  relatedEndpoint?: string;
  displayField?: string;
  relationshipKey?: string;
}

export interface StepDefinition {
  title: string;
  description?: string;
  fields: string[];
}

export interface FormDefinition {
  fields: FieldDefinition[];
  layout?: "single" | "two-column";
  steps?: StepDefinition[];
  fieldsPerStep?: number;
  stepVariant?: "horizontal" | "vertical";
}

// ─── Widget Definitions ─────────────────────────────────────────────

export type WidgetType = "stat" | "chart" | "activity";
export type ChartType = "line" | "bar" | "pie";
export type WidgetFormat = "number" | "currency" | "percentage";

export interface WidgetDefinition {
  type: WidgetType;
  label: string;
  endpoint?: string;
  icon?: string;
  color?: string;
  format?: WidgetFormat;
  chartType?: ChartType;
  limit?: number;
  colSpan?: 1 | 2 | 3 | 4;
}

export interface DashboardDefinition {
  widgets: WidgetDefinition[];
}

// ─── Resource Definition ────────────────────────────────────────────

export interface ResourceDefinition {
  name: string;
  slug: string;
  endpoint: string;
  icon: string;
  label?: { singular: string; plural: string };
  formView?: "modal" | "page" | "modal-steps" | "page-steps";
  table: TableDefinition;
  form: FormDefinition;
  dashboard?: DashboardDefinition;
}

// ─── defineResource Helper ──────────────────────────────────────────

export function defineResource(config: ResourceDefinition): ResourceDefinition {
  return {
    ...config,
    label: config.label ?? {
      singular: config.name,
      plural: config.slug.charAt(0).toUpperCase() + config.slug.slice(1),
    },
    table: {
      ...config.table,
      pageSize: config.table.pageSize ?? 20,
      actions: config.table.actions ?? ["create", "view", "edit", "delete"],
      searchable: config.table.searchable ?? true,
    },
    form: {
      ...config.form,
      layout: config.form.layout ?? "single",
    },
  };
}
