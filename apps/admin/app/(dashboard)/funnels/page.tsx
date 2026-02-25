"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Pencil,
  Search,
  Loader2,
  X,
  TrendingUp,
  Eye,
  BarChart3,
  Filter,
  ArrowRight,
} from "@/lib/icons";
import {
  useFunnels,
  useCreateFunnel,
  useDeleteFunnel,
} from "@/hooks/use-funnels";
import type { Funnel } from "@repo/shared/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_TABS = [
  { label: "All", value: "" },
  { label: "Draft", value: "draft" },
  { label: "Active", value: "active" },
  { label: "Archived", value: "archived" },
] as const;

const statusBadge: Record<string, string> = {
  draft: "bg-yellow-500/10 text-yellow-400",
  active: "bg-green-500/10 text-green-400",
  archived: "bg-zinc-500/10 text-zinc-400",
};

const typeBadge: Record<string, string> = {
  optin: "bg-accent/10 text-accent",
  sales: "bg-green-500/10 text-green-400",
  webinar: "bg-purple-500/10 text-purple-400",
  launch: "bg-orange-500/10 text-orange-400",
};

const FUNNEL_TYPES = ["optin", "sales", "webinar", "launch"] as const;

const stepDotColor: Record<string, string> = {
  landing: "bg-accent",
  sales: "bg-green-400",
  checkout: "bg-yellow-400",
  upsell: "bg-purple-400",
  downsell: "bg-orange-400",
  thankyou: "bg-blue-400",
};

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function FunnelsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<Funnel["type"]>("optin");
  const [newDescription, setNewDescription] = useState("");

  // Data
  const { data, isLoading } = useFunnels(page, search, statusFilter);
  const { mutate: createFunnel } = useCreateFunnel();
  const { mutate: deleteFunnel } = useDeleteFunnel();

  const funnels = data?.data ?? [];
  const meta = data?.meta;

  // Computed stats
  const totalFunnels = meta?.total ?? funnels.length;
  const activeFunnels = funnels.filter((f) => f.status === "active").length;
  const totalVisits = funnels.reduce((sum, f) => sum + (f.visit_count ?? 0), 0);
  const totalConversions = funnels.reduce(
    (sum, f) => sum + (f.conversion_count ?? 0),
    0
  );

  // Handlers
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    createFunnel(
      { name: newName, type: newType, description: newDescription },
      {
        onSuccess: () => {
          setShowCreate(false);
          setNewName("");
          setNewType("optin");
          setNewDescription("");
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this funnel? This cannot be undone.")) {
      deleteFunnel(id);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Funnels</h1>
          <p className="text-text-secondary mt-1">
            Build and manage your sales funnels.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Funnel
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-bg-secondary p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-text-muted">Total Funnels</p>
              <p className="text-2xl font-bold text-foreground">
                {totalFunnels}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-bg-secondary p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <TrendingUp className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-text-muted">Active Funnels</p>
              <p className="text-2xl font-bold text-foreground">
                {activeFunnels}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-bg-secondary p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
              <Eye className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-text-muted">Total Visits</p>
              <p className="text-2xl font-bold text-foreground">
                {totalVisits.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-bg-secondary p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
              <BarChart3 className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-text-muted">Total Conversions</p>
              <p className="text-2xl font-bold text-foreground">
                {totalConversions.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search + Status Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search funnels..."
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

      {/* Create Funnel Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-bg-elevated p-6 space-y-4 mx-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Create Funnel
              </h2>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg p-1 text-text-muted hover:bg-bg-hover hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Name
              </label>
              <input
                type="text"
                placeholder="Funnel name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Type
              </label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as Funnel["type"])}
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              >
                {FUNNEL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Description
              </label>
              <textarea
                placeholder="Brief description (optional)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none resize-y"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Funnel Cards Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : funnels.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-bg-secondary p-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
              <TrendingUp className="h-7 w-7 text-accent" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            No funnels yet
          </h3>
          <p className="text-sm text-text-muted mb-5">
            Create your first funnel to start capturing leads and driving
            conversions.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Funnel
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {funnels.map((funnel) => {
              const steps = [...(funnel.steps ?? [])].sort(
                (a, b) => a.sort_order - b.sort_order
              );
              const visits = funnel.visit_count ?? 0;
              const conversions = funnel.conversion_count ?? 0;

              return (
                <div
                  key={funnel.id}
                  className="rounded-xl border border-border bg-bg-secondary p-5 space-y-4 hover:border-border/80 transition-colors"
                >
                  {/* Top row: name, type, status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/funnels/${funnel.id}`}
                          className="text-lg font-semibold text-foreground hover:text-accent transition-colors truncate"
                        >
                          {funnel.name}
                        </Link>
                        <span
                          className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            typeBadge[funnel.type] ??
                            "bg-bg-elevated text-text-muted"
                          }`}
                        >
                          {funnel.type}
                        </span>
                      </div>
                      {funnel.description && (
                        <p className="text-sm text-text-muted mt-1 line-clamp-1">
                          {funnel.description}
                        </p>
                      )}
                    </div>
                    <span
                      className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                        statusBadge[funnel.status] ??
                        "bg-bg-elevated text-text-muted"
                      }`}
                    >
                      {funnel.status}
                    </span>
                  </div>

                  {/* Metrics row */}
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-1.5 text-text-secondary">
                      <Filter className="h-3.5 w-3.5 text-text-muted" />
                      <span>
                        {steps.length} step{steps.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-text-secondary">
                      <Eye className="h-3.5 w-3.5 text-text-muted" />
                      <span>{visits.toLocaleString()} visits</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-text-secondary">
                      <BarChart3 className="h-3.5 w-3.5 text-text-muted" />
                      <span>{conversions.toLocaleString()} conversions</span>
                    </div>
                  </div>

                  {/* Step pipeline preview */}
                  {steps.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {steps.map((step, idx) => (
                        <div key={step.id} className="flex items-center gap-1.5">
                          <div
                            className={`h-2.5 w-2.5 rounded-full ${
                              stepDotColor[step.type] ?? "bg-zinc-400"
                            }`}
                            title={`${step.name} (${step.type})`}
                          />
                          {idx < steps.length - 1 && (
                            <ArrowRight className="h-3 w-3 text-text-muted/50" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1 border-t border-border/50 pt-3">
                    <Link
                      href={`/funnels/${funnel.id}`}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/10 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(funnel.id)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-text-muted hover:bg-danger/10 hover:text-danger transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {meta && meta.pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-muted">
                {meta.total} total funnel{meta.total !== 1 ? "s" : ""}
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
        </>
      )}
    </div>
  );
}
