import type { ColumnDefinition } from "@/lib/resource";
import { Check, X, Play, ExternalLink } from "@/lib/icons";
import { formatDate, formatRelative, formatCurrency } from "@/lib/formatters";

export function renderCell(
  column: ColumnDefinition,
  value: unknown,
  _row: Record<string, unknown>
): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-text-muted">—</span>;
  }

  let content: React.ReactNode;

  switch (column.format) {
    case "badge":
      content = <BadgeCell value={String(value)} config={column.badge} />;
      break;
    case "boolean":
      content = <BooleanCell value={Boolean(value)} />;
      break;
    case "currency":
      content = <CurrencyCell value={Number(value)} prefix={column.currencyPrefix} />;
      break;
    case "date":
      content = <DateCell value={String(value)} />;
      break;
    case "relative":
      content = <RelativeCell value={String(value)} />;
      break;
    case "image":
      content = <ImageCell value={String(value)} />;
      break;
    case "video":
      content = <VideoCell value={String(value)} />;
      break;
    case "link":
      content = <LinkCell value={String(value)} />;
      break;
    case "email":
      content = <EmailCell value={String(value)} />;
      break;
    case "color":
      content = <ColorCell value={String(value)} />;
      break;
    case "richtext":
      content = <RichTextCell value={String(value)} />;
      break;
    default:
      content = <span>{String(value)}</span>;
  }

  if (column.className) {
    return <span className={column.className}>{content}</span>;
  }
  return content;
}

function BadgeCell({
  value,
  config,
}: {
  value: string;
  config?: Record<string, { color: string; label: string }>;
}) {
  const badge = config?.[value];
  if (!badge) {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-bg-hover text-text-secondary">
        {value}
      </span>
    );
  }

  const colorMap: Record<string, string> = {
    accent: "bg-accent/10 text-accent",
    success: "bg-success/10 text-success",
    danger: "bg-danger/10 text-danger",
    warning: "bg-warning/10 text-warning",
    info: "bg-info/10 text-info",
    muted: "bg-bg-hover text-text-secondary",
    green: "bg-success/10 text-success",
    red: "bg-danger/10 text-danger",
    yellow: "bg-warning/10 text-warning",
    blue: "bg-info/10 text-info",
  };

  const className = colorMap[badge.color] ?? "bg-bg-hover text-text-secondary";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {badge.label}
    </span>
  );
}

function BooleanCell({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex items-center gap-1 text-success">
      <Check className="h-3.5 w-3.5" />
      <span className="text-xs">Active</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-text-muted">
      <X className="h-3.5 w-3.5" />
      <span className="text-xs">Inactive</span>
    </span>
  );
}

function CurrencyCell({ value, prefix = "$" }: { value: number; prefix?: string }) {
  return <span className="font-mono text-sm">{formatCurrency(value, prefix)}</span>;
}

function DateCell({ value }: { value: string }) {
  return <span className="text-text-secondary text-sm">{formatDate(value)}</span>;
}

function RelativeCell({ value }: { value: string }) {
  return <span className="text-text-secondary text-sm">{formatRelative(value)}</span>;
}

function ImageCell({ value }: { value: string }) {
  return (
    <img
      src={value}
      alt=""
      className="h-8 w-8 rounded-full object-cover border border-border"
    />
  );
}

function VideoCell({ value }: { value: string }) {
  return (
    <div className="relative h-10 w-16 rounded overflow-hidden bg-bg-tertiary">
      <video src={value} className="h-full w-full object-cover" muted />
      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
        <Play className="h-3.5 w-3.5 text-white fill-white" />
      </div>
    </div>
  );
}

function LinkCell({ value }: { value: string }) {
  let hostname = value;
  try {
    hostname = new URL(value).hostname;
  } catch {
    // use raw value if not a valid URL
  }
  return (
    <a
      href={value}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
    >
      {hostname}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

function EmailCell({ value }: { value: string }) {
  return (
    <a
      href={`mailto:${value}`}
      className="text-sm text-accent hover:underline"
    >
      {value}
    </a>
  );
}

function ColorCell({ value }: { value: string }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span
        className="h-5 w-5 rounded-full border border-border shrink-0"
        style={{ backgroundColor: value }}
      />
      <span className="font-mono text-xs text-text-secondary">{value}</span>
    </div>
  );
}

function RichTextCell({ value }: { value: string }) {
  const stripped = value.replace(/<[^>]*>/g, "").trim();
  const truncated = stripped.length > 100 ? stripped.slice(0, 100) + "..." : stripped;
  return <span className="text-text-secondary">{truncated}</span>;
}
