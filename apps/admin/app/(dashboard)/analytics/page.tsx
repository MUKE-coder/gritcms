"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users,
  DollarSign,
  Mail,
  GraduationCap,
  ShoppingBag,
  TrendingUp,
  BarChart3,
} from "@/lib/icons";
import {
  useAnalyticsDashboard,
  useRevenueChart,
  useTopProducts,
} from "@/hooks/use-analytics";
import type { LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const currencyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

function fmtCurrency(cents: number) {
  return currencyFmt.format(cents / 100);
}

function fmtNumber(n: number) {
  return n.toLocaleString("en-US");
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Stat card config
// ---------------------------------------------------------------------------

interface StatConfig {
  label: string;
  key: string;
  icon: LucideIcon;
  color: string; // tailwind colour token
  isCurrency?: boolean;
}

const row1Stats: StatConfig[] = [
  { label: "Total Contacts", key: "total_contacts", icon: Users, color: "accent" },
  { label: "New (30d)", key: "new_contacts_30d", icon: TrendingUp, color: "success" },
  { label: "Total Subscribers", key: "total_subscribers", icon: Mail, color: "info" },
  { label: "Emails Sent", key: "total_emails_sent", icon: Mail, color: "warning" },
];

const row2Stats: StatConfig[] = [
  { label: "Total Revenue", key: "total_revenue", icon: DollarSign, color: "success", isCurrency: true },
  { label: "Monthly Revenue", key: "monthly_revenue", icon: DollarSign, color: "accent", isCurrency: true },
  { label: "MRR", key: "mrr", icon: BarChart3, color: "info", isCurrency: true },
  { label: "Total Orders", key: "total_orders", icon: ShoppingBag, color: "warning" },
];

// ---------------------------------------------------------------------------
// Period selector options
// ---------------------------------------------------------------------------

const periodOptions = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
] as const;

// ---------------------------------------------------------------------------
// Skeleton helpers
// ---------------------------------------------------------------------------

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-bg-hover ${className}`}
    />
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AnalyticsPage() {
  const { data: dashboard, isLoading: dashLoading } = useAnalyticsDashboard();
  const [revenueDays, setRevenueDays] = useState<number>(30);
  const { data: revenueData } = useRevenueChart(revenueDays);
  const { data: topProducts } = useTopProducts(5);

  // Revenue chart helpers
  const revenuePoints = revenueData ?? [];
  const maxRevenue = Math.max(...revenuePoints.map((p) => p.revenue), 1);
  const periodTotal = revenuePoints.reduce((sum, p) => sum + p.revenue, 0);

  return (
    <div className="space-y-8">
      {/* ----------------------------------------------------------------- */}
      {/* Header                                                            */}
      {/* ----------------------------------------------------------------- */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-text-secondary mt-1">
          Overview of your platform metrics, revenue, and activity.
        </p>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Stats Row 1                                                       */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {row1Stats.map((stat) => {
          const Icon = stat.icon;
          const raw = dashboard
            ? (dashboard as Record<string, unknown>)[stat.key]
            : undefined;
          const value =
            raw !== undefined
              ? stat.isCurrency
                ? fmtCurrency(raw as number)
                : fmtNumber(raw as number)
              : null;

          return (
            <div
              key={stat.key}
              className="rounded-xl border border-border bg-bg-secondary p-5 transition-colors hover:border-border/80"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-${stat.color}/10`}
                >
                  <Icon className={`h-5 w-5 text-${stat.color}`} />
                </div>
                <div className="min-w-0">
                  {dashLoading || value === null ? (
                    <Skeleton className="h-7 w-20 mb-1" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground truncate">
                      {value}
                    </p>
                  )}
                  <p className="text-xs text-text-muted">{stat.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Stats Row 2                                                       */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {row2Stats.map((stat) => {
          const Icon = stat.icon;
          const raw = dashboard
            ? (dashboard as Record<string, unknown>)[stat.key]
            : undefined;
          const value =
            raw !== undefined
              ? stat.isCurrency
                ? fmtCurrency(raw as number)
                : fmtNumber(raw as number)
              : null;

          return (
            <div
              key={stat.key}
              className="rounded-xl border border-border bg-bg-secondary p-5 transition-colors hover:border-border/80"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-${stat.color}/10`}
                >
                  <Icon className={`h-5 w-5 text-${stat.color}`} />
                </div>
                <div className="min-w-0">
                  {dashLoading || value === null ? (
                    <Skeleton className="h-7 w-24 mb-1" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground truncate">
                      {value}
                    </p>
                  )}
                  <p className="text-xs text-text-muted">{stat.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Revenue Chart                                                     */}
      {/* ----------------------------------------------------------------- */}
      <div className="rounded-xl border border-border bg-bg-secondary p-6">
        {/* Chart header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Revenue (Last {revenueDays} Days)
            </h2>
            {revenuePoints.length > 0 && (
              <p className="text-sm text-text-secondary mt-0.5">
                Period total: {fmtCurrency(periodTotal)}
              </p>
            )}
          </div>

          {/* Period selector */}
          <div className="flex gap-1 rounded-lg bg-bg-elevated p-1">
            {periodOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRevenueDays(opt.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  revenueDays === opt.value
                    ? "bg-accent text-white"
                    : "text-text-secondary hover:text-foreground hover:bg-bg-hover"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bar chart */}
        {revenuePoints.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-text-muted text-sm">
            No revenue data available for this period.
          </div>
        ) : (
          <div className="space-y-2">
            {/* Bars */}
            <div className="flex items-end gap-[2px] h-48">
              {revenuePoints.map((point, idx) => {
                const heightPct = (point.revenue / maxRevenue) * 100;
                return (
                  <div
                    key={point.date}
                    className="group relative flex-1 flex flex-col justify-end h-full"
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                      <div className="rounded-lg bg-bg-elevated border border-border px-3 py-2 shadow-lg whitespace-nowrap">
                        <p className="text-xs font-medium text-foreground">
                          {fmtCurrency(point.revenue)}
                        </p>
                        <p className="text-xs text-text-muted">
                          {point.orders} order{point.orders !== 1 ? "s" : ""}
                        </p>
                        <p className="text-xs text-text-muted">
                          {fmtShortDate(point.date)}
                        </p>
                      </div>
                    </div>

                    {/* Bar */}
                    <div
                      className="w-full rounded-t-sm bg-accent hover:bg-accent/80 transition-colors cursor-default"
                      style={{
                        height: `${Math.max(heightPct, 1)}%`,
                        minHeight: point.revenue > 0 ? "4px" : "1px",
                      }}
                    />

                    {/* X-axis label (every 5th bar) */}
                    {idx % 5 === 0 && (
                      <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-text-muted whitespace-nowrap">
                        {fmtShortDate(point.date)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Spacer for x-axis labels */}
            <div className="h-4" />
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Two-column: Top Products + Recent Orders                          */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Products */}
        <div className="rounded-xl border border-border bg-bg-secondary p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Top Products
          </h2>

          {!topProducts || topProducts.length === 0 ? (
            <p className="text-sm text-text-muted">No product data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-text-muted">
                    <th className="pb-2 pr-3 font-medium">#</th>
                    <th className="pb-2 pr-3 font-medium">Product</th>
                    <th className="pb-2 pr-3 font-medium text-right">Sales</th>
                    <th className="pb-2 font-medium text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((product, idx) => (
                    <tr
                      key={product.product_id}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="py-3 pr-3 text-text-muted">{idx + 1}</td>
                      <td className="py-3 pr-3 font-medium text-foreground truncate max-w-[200px]">
                        {product.name}
                      </td>
                      <td className="py-3 pr-3 text-right text-text-secondary">
                        {fmtNumber(product.sales)}
                      </td>
                      <td className="py-3 text-right font-medium text-foreground">
                        {fmtCurrency(product.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="rounded-xl border border-border bg-bg-secondary p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Recent Orders
            </h2>
            <Link
              href="/orders"
              className="text-xs text-accent hover:text-accent/80 transition-colors"
            >
              View all
            </Link>
          </div>

          {dashLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !dashboard?.recent_orders ||
            dashboard.recent_orders.length === 0 ? (
            <p className="text-sm text-text-muted">No orders yet.</p>
          ) : (
            <div className="space-y-2">
              {dashboard.recent_orders.slice(0, 5).map((order) => (
                <Link
                  key={order.id}
                  href="/orders"
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg-elevated p-3 hover:bg-bg-hover transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors truncate">
                      #{order.order_number}
                    </p>
                    <p className="text-xs text-text-muted truncate">
                      {order.contact
                        ? `${order.contact.first_name} ${order.contact.last_name}`.trim()
                        : `Contact #${order.contact_id}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-foreground">
                      {fmtCurrency(order.total)}
                    </p>
                    <p className="text-xs text-text-muted">
                      {fmtDate(order.created_at)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Recent Contacts                                                   */}
      {/* ----------------------------------------------------------------- */}
      <div className="rounded-xl border border-border bg-bg-secondary p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Recent Contacts
          </h2>
          <Link
            href="/contacts"
            className="text-xs text-accent hover:text-accent/80 transition-colors"
          >
            View all
          </Link>
        </div>

        {dashLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : !dashboard?.recent_contacts ||
          dashboard.recent_contacts.length === 0 ? (
          <p className="text-sm text-text-muted">No contacts yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {dashboard.recent_contacts.map((contact) => (
              <Link
                key={contact.id}
                href={`/contacts/${contact.id}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-bg-elevated p-3 hover:bg-bg-hover transition-colors group"
              >
                {/* Avatar circle */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent text-sm font-semibold">
                  {(contact.first_name?.[0] ?? contact.email[0] ?? "?").toUpperCase()}
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors truncate">
                    {contact.first_name || contact.last_name
                      ? `${contact.first_name} ${contact.last_name}`.trim()
                      : contact.email}
                  </p>
                  <p className="text-xs text-text-muted truncate">
                    {contact.email}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {contact.source && (
                      <span className="text-[10px] text-text-muted bg-bg-hover rounded px-1.5 py-0.5">
                        {contact.source}
                      </span>
                    )}
                    <span className="text-[10px] text-text-muted">
                      {fmtDate(contact.created_at)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
