"use client";

import { useState } from "react";
import Link from "next/link";
import { useConfirm } from "@/hooks/use-confirm";
import {
  useCourses,
  useDeleteCourse,
  useDuplicateCourse,
  useCreateCourse,
  useCourseDashboard,
} from "@/hooks/use-courses";
import {
  Plus,
  Trash2,
  Pencil,
  Search,
  Loader2,
  X,
  Image,
  BookOpen,
  Users,
  DollarSign,
  TrendingUp,
} from "@/lib/icons";
import type { Course } from "@repo/shared/types";

const STATUS_TABS = [
  { label: "All", value: "" },
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" },
] as const;

const statusBadge: Record<string, string> = {
  draft: "bg-yellow-500/10 text-yellow-400",
  published: "bg-green-500/10 text-green-400",
  archived: "bg-zinc-500/10 text-zinc-400",
};

const accessBadge: Record<string, string> = {
  free: "bg-green-500/10 text-green-400",
  paid: "bg-accent/10 text-accent",
  membership: "bg-purple-500/10 text-purple-400",
};

function formatPrice(price: number, currency: string) {
  if (price === 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price / 100);
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

export default function CoursesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newAccessType, setNewAccessType] = useState<"free" | "paid" | "membership">("free");
  const [newPrice, setNewPrice] = useState("");
  const [newCurrency, setNewCurrency] = useState("USD");

  const { data, isLoading } = useCourses({
    page,
    pageSize: 20,
    status: statusFilter || undefined,
    search: search || undefined,
  });

  const confirm = useConfirm();
  const { mutate: deleteCourse } = useDeleteCourse();
  const { mutate: duplicateCourse } = useDuplicateCourse();
  const { mutate: createCourse } = useCreateCourse();
  const { data: dashboard } = useCourseDashboard();

  const stats = [
    {
      label: "Course Revenue",
      value: dashboard ? formatCurrency(dashboard.course_revenue) : "--",
      icon: DollarSign,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Total Enrollments",
      value: dashboard?.total_enrollments ?? "--",
      icon: Users,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      label: "Published Courses",
      value: dashboard?.published_courses ?? "--",
      icon: BookOpen,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      label: "Monthly Revenue",
      value: dashboard ? formatCurrency(dashboard.monthly_revenue) : "--",
      icon: TrendingUp,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
  ];

  const courses = data?.data ?? [];
  const meta = data?.meta;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleCreate = () => {
    const body: Partial<Course> = {
      title: newTitle,
      short_description: newDescription,
      access_type: newAccessType,
      currency: newCurrency,
    };
    if (newAccessType === "paid" && newPrice) {
      body.price = Math.round(parseFloat(newPrice) * 100);
    } else {
      body.price = 0;
    }
    createCourse(body, {
      onSuccess: () => {
        setShowCreate(false);
        setNewTitle("");
        setNewDescription("");
        setNewAccessType("free");
        setNewPrice("");
        setNewCurrency("USD");
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-bg-secondary p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-muted">{stat.label}</p>
              <div className={`rounded-lg p-2 ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Courses</h1>
          <p className="text-text-secondary mt-1">
            Create and manage your online courses.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Course
        </button>
      </div>

      {/* Search + Status Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search courses..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg-secondary py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-bg-secondary p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === tab.value
                  ? "bg-accent text-white"
                  : "text-text-muted hover:text-foreground hover:bg-bg-hover"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Create Course Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-bg-elevated p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Create Course
              </h2>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg p-1 text-text-muted hover:bg-bg-hover hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Course title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
            />
            <textarea
              placeholder="Short description (optional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
            />
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Access Type
              </label>
              <select
                value={newAccessType}
                onChange={(e) =>
                  setNewAccessType(e.target.value as "free" | "paid" | "membership")
                }
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              >
                <option value="free">Free</option>
                <option value="paid">Paid</option>
                <option value="membership">Membership</option>
              </select>
            </div>
            {newAccessType === "paid" && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="29.99"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  />
                </div>
                <div className="w-28">
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Currency
                  </label>
                  <select
                    value={newCurrency}
                    onChange={(e) => setNewCurrency(e.target.value)}
                    className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CAD">CAD</option>
                    <option value="AUD">AUD</option>
                  </select>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newTitle.trim()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-elevated">
                <th className="px-4 py-3 text-left font-medium text-text-muted">
                  Course
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">
                  Access
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">
                  Price
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">
                  Enrollments
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">
                  Created
                </th>
                <th className="px-4 py-3 text-right font-medium text-text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr
                  key={course.id}
                  className="border-b border-border/50 hover:bg-bg-hover transition-colors"
                >
                  {/* Thumbnail + Title + Slug */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {course.thumbnail ? (
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          className="h-10 w-14 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="flex h-10 w-14 items-center justify-center rounded-lg bg-bg-elevated flex-shrink-0">
                          <Image className="h-4 w-4 text-text-muted" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <Link
                          href={`/courses/${course.id}`}
                          className="font-medium text-foreground hover:text-accent block truncate"
                        >
                          {course.title}
                        </Link>
                        <p className="text-xs text-text-muted truncate">
                          /{course.slug}
                        </p>
                      </div>
                    </div>
                  </td>
                  {/* Status */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        statusBadge[course.status] ?? "bg-bg-elevated text-text-muted"
                      }`}
                    >
                      {course.status}
                    </span>
                  </td>
                  {/* Access Type */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        accessBadge[course.access_type] ?? "bg-bg-elevated text-text-muted"
                      }`}
                    >
                      {course.access_type}
                    </span>
                  </td>
                  {/* Price */}
                  <td className="px-4 py-3 text-text-secondary">
                    {course.access_type === "free"
                      ? "Free"
                      : formatPrice(course.price, course.currency)}
                  </td>
                  {/* Enrollments */}
                  <td className="px-4 py-3 text-text-secondary">
                    {course.enrollment_count ?? 0}
                  </td>
                  {/* Created */}
                  <td className="px-4 py-3 text-text-muted">
                    {new Date(course.created_at).toLocaleDateString()}
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/courses/${course.id}`}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-foreground"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={async () => {
                          const ok = await confirm({ title: "Duplicate Course", description: "Create a copy of this course?", confirmLabel: "Duplicate" });
                          if (ok) duplicateCourse(course.id);
                        }}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-foreground"
                        title="Duplicate"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={async () => {
                          const ok = await confirm({ title: "Delete Course", description: "Delete this course? This cannot be undone.", confirmLabel: "Delete", variant: "danger" });
                          if (ok) deleteCourse(course.id);
                        }}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-danger/10 hover:text-danger"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {courses.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-text-muted"
                  >
                    No courses found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {meta && meta.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-text-muted">
                {meta.total} total course{meta.total !== 1 ? "s" : ""}
              </p>
              <div className="flex gap-1">
                {Array.from({ length: meta.pages }, (_, i) => i + 1).map(
                  (p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`rounded-lg px-3 py-1 text-sm ${
                        p === page
                          ? "bg-accent text-white"
                          : "text-text-muted hover:bg-bg-hover"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
