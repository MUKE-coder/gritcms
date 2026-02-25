"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  GraduationCap,
  ShoppingBag,
  Tag,
  Clock,
  User,
  Globe,
  Phone,
  Loader2,
  DollarSign,
  Award,
} from "@/lib/icons";
import { useContactProfile } from "@/hooks/use-analytics";
import type { ContactProfile } from "@repo/shared/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = "activity" | "email" | "courses" | "purchases" | "notes";

type ActivityModule = "all" | "email" | "courses" | "commerce";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days !== 1 ? "s" : ""} ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks !== 1 ? "s" : ""} ago`;
  }
  return formatDate(dateStr);
}

function getInitials(firstName: string, lastName: string): string {
  return `${(firstName || "")[0] ?? ""}${(lastName || "")[0] ?? ""}`.toUpperCase() || "?";
}

function statusBadge(status: string): string {
  switch (status) {
    case "active":
    case "subscribed":
    case "completed":
    case "paid":
      return "bg-success/10 text-success";
    case "unsubscribed":
    case "cancelled":
    case "refunded":
      return "bg-danger/10 text-danger";
    case "pending":
    case "in_progress":
    case "enrolled":
      return "bg-warning/10 text-warning";
    case "draft":
    case "paused":
      return "bg-bg-elevated text-text-muted";
    default:
      return "bg-bg-elevated text-text-muted";
  }
}

function activityIcon(module: string) {
  switch (module) {
    case "email":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 shrink-0">
          <Mail className="h-4 w-4 text-blue-400" />
        </div>
      );
    case "courses":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 shrink-0">
          <GraduationCap className="h-4 w-4 text-success" />
        </div>
      );
    case "commerce":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 shrink-0">
          <ShoppingBag className="h-4 w-4 text-purple-400" />
        </div>
      );
    default:
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg-elevated shrink-0">
          <Clock className="h-4 w-4 text-text-muted" />
        </div>
      );
  }
}

// ---------------------------------------------------------------------------
// Tab labels
// ---------------------------------------------------------------------------

const TAB_CONFIG: { key: Tab; label: string }[] = [
  { key: "activity", label: "Activity" },
  { key: "email", label: "Email" },
  { key: "courses", label: "Courses" },
  { key: "purchases", label: "Purchases" },
  { key: "notes", label: "Notes" },
];

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ContactDetailPage() {
  const params = useParams();
  const contactId = Number(params.id);

  const { data: profile, isLoading } = useContactProfile(contactId);

  const [activeTab, setActiveTab] = useState<Tab>("activity");
  const [activityFilter, setActivityFilter] = useState<ActivityModule>("all");

  // Filtered activities
  const filteredActivities = useMemo(() => {
    if (!profile?.activities) return [];
    if (activityFilter === "all") return profile.activities;
    return profile.activities.filter((a) => a.module === activityFilter);
  }, [profile?.activities, activityFilter]);

  // -------------------------------------------------------------------------
  // Loading
  // -------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <p className="text-text-secondary">Contact not found.</p>
        <Link href="/contacts" className="text-accent hover:underline text-sm">
          Back to contacts
        </Link>
      </div>
    );
  }

  const { contact } = profile;
  const fullName =
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
    contact.email;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* ================================================================= */}
      {/* HEADER                                                            */}
      {/* ================================================================= */}
      <div className="space-y-5">
        {/* Back link */}
        <Link
          href="/contacts"
          className="inline-flex items-center gap-1.5 rounded-lg p-1.5 text-sm text-text-muted hover:bg-bg-hover hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to contacts
        </Link>

        {/* Profile card */}
        <div className="rounded-xl border border-border bg-bg-secondary p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            {/* Avatar */}
            <div className="shrink-0">
              {contact.avatar_url ? (
                <img
                  src={contact.avatar_url}
                  alt={fullName}
                  className="h-20 w-20 rounded-full object-cover border-2 border-border"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 border-2 border-accent/20">
                  <span className="text-2xl font-bold text-accent">
                    {getInitials(contact.first_name, contact.last_name)}
                  </span>
                </div>
              )}
            </div>

            {/* Name, email, phone, tags */}
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <h1 className="text-2xl font-bold text-foreground truncate">
                  {fullName}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                  <span className="flex items-center gap-1.5 text-sm text-text-secondary">
                    <Mail className="h-3.5 w-3.5" />
                    {contact.email}
                  </span>
                  {contact.phone && (
                    <span className="flex items-center gap-1.5 text-sm text-text-secondary">
                      <Phone className="h-3.5 w-3.5" />
                      {contact.phone}
                    </span>
                  )}
                </div>
              </div>

              {/* Tags */}
              {contact.tags && contact.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {contact.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: `${tag.color}20`,
                        color: tag.color,
                      }}
                    >
                      <Tag className="h-3 w-3" />
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Info row */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-muted">
                {contact.source && (
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Source: {contact.source}
                  </span>
                )}
                {(contact.country || contact.city) && (
                  <span className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" />
                    {[contact.city, contact.country].filter(Boolean).join(", ")}
                  </span>
                )}
                {contact.created_at && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Member since {formatDate(contact.created_at)}
                  </span>
                )}
                {contact.last_activity_at && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Last active {timeAgo(contact.last_activity_at)}
                  </span>
                )}
              </div>
            </div>

            {/* Lifetime value card */}
            <div className="shrink-0 rounded-xl border border-border bg-bg-elevated p-4 text-center min-w-[140px]">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <DollarSign className="h-4 w-4 text-success" />
                <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
                  Lifetime Value
                </span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(profile.lifetime_value)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* TABS                                                              */}
      {/* ================================================================= */}
      <div className="border-b border-border">
        <nav className="flex gap-6">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "text-accent"
                  : "text-text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-accent" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ================================================================= */}
      {/* TAB 1: ACTIVITY TIMELINE                                          */}
      {/* ================================================================= */}
      {activeTab === "activity" && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Activity Timeline
            </h2>
            <select
              value={activityFilter}
              onChange={(e) =>
                setActivityFilter(e.target.value as ActivityModule)
              }
              className="rounded-lg border border-border bg-bg-elevated px-3 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
            >
              <option value="all">All Modules</option>
              <option value="email">Email</option>
              <option value="courses">Courses</option>
              <option value="commerce">Commerce</option>
            </select>
          </div>

          {/* Activity list */}
          {filteredActivities.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-bg-secondary p-12 text-center">
              <Clock className="h-10 w-10 text-text-muted mx-auto mb-3" />
              <p className="text-sm text-text-secondary">
                No activity recorded yet.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 rounded-lg px-4 py-3 hover:bg-bg-hover transition-colors"
                >
                  {activityIcon(activity.module)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {activity.action}
                    </p>
                    {activity.details && (
                      <p className="text-xs text-text-muted mt-0.5 truncate">
                        {activity.details}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-text-muted">
                    {timeAgo(activity.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: EMAIL                                                      */}
      {/* ================================================================= */}
      {activeTab === "email" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Email Subscriptions
          </h2>

          {!profile.subscriptions || profile.subscriptions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-bg-secondary p-12 text-center">
              <Mail className="h-10 w-10 text-text-muted mx-auto mb-3" />
              <p className="text-sm text-text-secondary">
                No email subscriptions.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-bg-secondary divide-y divide-border">
              {profile.subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center gap-4 px-5 py-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 shrink-0">
                    <Mail className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {sub.list?.name ?? `List #${sub.list_id}`}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadge(sub.status)}`}
                  >
                    {sub.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 3: COURSES                                                    */}
      {/* ================================================================= */}
      {activeTab === "courses" && (
        <div className="space-y-6">
          {/* Enrollments */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Course Enrollments
            </h2>

            {!profile.enrollments || profile.enrollments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-bg-secondary p-12 text-center">
                <GraduationCap className="h-10 w-10 text-text-muted mx-auto mb-3" />
                <p className="text-sm text-text-secondary">
                  No course enrollments.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-bg-secondary divide-y divide-border">
                {profile.enrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="flex items-center gap-4 px-5 py-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 shrink-0">
                      <GraduationCap className="h-5 w-5 text-success" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-medium text-foreground truncate">
                          {enrollment.course?.title ??
                            `Course #${enrollment.course_id}`}
                        </p>
                        <span
                          className={`shrink-0 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadge(enrollment.status)}`}
                        >
                          {enrollment.status}
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 rounded-full bg-bg-elevated overflow-hidden">
                          <div
                            className="h-full rounded-full bg-accent transition-all"
                            style={{
                              width: `${Math.min(100, enrollment.progress_percentage ?? 0)}%`,
                            }}
                          />
                        </div>
                        <span className="shrink-0 text-xs font-medium text-text-muted w-10 text-right">
                          {Math.round(enrollment.progress_percentage ?? 0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Certificates */}
          {profile.certificates && profile.certificates.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                Certificates
              </h2>
              <div className="rounded-xl border border-border bg-bg-secondary divide-y divide-border">
                {profile.certificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="flex items-center gap-4 px-5 py-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10 shrink-0">
                      <Award className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {cert.course?.title ?? "Certificate"}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        #{cert.certificate_number}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-text-muted">
                      {formatDate(cert.issued_at)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 4: PURCHASES                                                  */}
      {/* ================================================================= */}
      {activeTab === "purchases" && (
        <div className="space-y-6">
          {/* Orders */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Orders</h2>

            {!profile.orders || profile.orders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-bg-secondary p-12 text-center">
                <ShoppingBag className="h-10 w-10 text-text-muted mx-auto mb-3" />
                <p className="text-sm text-text-secondary">No purchases.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-bg-secondary divide-y divide-border">
                {profile.orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center gap-4 px-5 py-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 shrink-0">
                      <ShoppingBag className="h-5 w-5 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        #{order.order_number}
                      </p>
                      {order.paid_at && (
                        <p className="text-xs text-text-muted mt-0.5">
                          {formatDate(order.paid_at)}
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadge(order.status)}`}
                    >
                      {order.status}
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-foreground min-w-[80px] text-right">
                      {formatCurrency(order.total, order.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Subscriptions */}
          {profile.active_subs && profile.active_subs.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                Active Subscriptions
              </h2>
              <div className="rounded-xl border border-border bg-bg-secondary divide-y divide-border">
                {profile.active_subs.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center gap-4 px-5 py-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 shrink-0">
                      <DollarSign className="h-5 w-5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {sub.product?.name ?? "Subscription"}
                      </p>
                      {sub.price && (
                        <p className="text-xs text-text-muted mt-0.5">
                          {formatCurrency(sub.price.amount, sub.price.currency)}{" "}
                          / {sub.price.interval}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-success/10 text-success">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 5: NOTES (Placeholder)                                        */}
      {/* ================================================================= */}
      {activeTab === "notes" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Notes</h2>
          <div className="rounded-xl border border-border bg-bg-secondary p-6 space-y-4">
            <textarea
              placeholder="Add a note about this contact..."
              rows={6}
              className="w-full rounded-lg border border-border bg-bg-elevated px-4 py-3 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none resize-y"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-muted">
                Notes feature coming soon.
              </p>
              <button
                disabled
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white opacity-50 cursor-not-allowed"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
