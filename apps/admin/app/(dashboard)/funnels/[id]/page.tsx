"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  X,
  Eye,
  BarChart3,
  TrendingUp,
  DollarSign,
} from "@/lib/icons";
import {
  useFunnel,
  useUpdateFunnel,
  useFunnelAnalytics,
  useCreateStep,
  useUpdateStep,
  useDeleteStep,
} from "@/hooks/use-funnels";
import { useConfirm } from "@/hooks/use-confirm";
import type { Funnel, FunnelStep } from "@repo/shared/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type Tab = "steps" | "analytics";

const STEP_TYPES = [
  "landing",
  "sales",
  "checkout",
  "upsell",
  "downsell",
  "thankyou",
] as const;

type StepType = (typeof STEP_TYPES)[number];

const STATUS_OPTIONS: Funnel["status"][] = ["draft", "active", "archived"];

const statusBadge: Record<string, string> = {
  draft: "bg-yellow-500/10 text-yellow-400",
  active: "bg-green-500/10 text-green-400",
  archived: "bg-zinc-500/10 text-zinc-400",
};

const stepTypeBadge: Record<string, string> = {
  landing: "bg-accent/10 text-accent",
  sales: "bg-green-500/10 text-green-400",
  checkout: "bg-yellow-500/10 text-yellow-400",
  upsell: "bg-purple-500/10 text-purple-400",
  downsell: "bg-orange-500/10 text-orange-400",
  thankyou: "bg-blue-500/10 text-blue-400",
};

const stepCardBorder: Record<string, string> = {
  landing: "border-accent/40",
  sales: "border-green-500/40",
  checkout: "border-yellow-500/40",
  upsell: "border-purple-500/40",
  downsell: "border-orange-500/40",
  thankyou: "border-blue-500/40",
};

// ---------------------------------------------------------------------------
// Step form interface
// ---------------------------------------------------------------------------

interface StepForm {
  name: string;
  type: StepType;
  slug: string;
}

const emptyStepForm: StepForm = { name: "", type: "landing", slug: "" };

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function FunnelEditorPage() {
  const confirm = useConfirm();
  const params = useParams();
  const funnelId = Number(params.id);

  // Data
  const { data: funnel, isLoading } = useFunnel(funnelId);
  const { data: analytics } = useFunnelAnalytics(funnelId);

  // Mutations
  const { mutate: updateFunnel } = useUpdateFunnel();
  const { mutate: createStep } = useCreateStep();
  const { mutate: updateStep } = useUpdateStep();
  const { mutate: deleteStep } = useDeleteStep();

  // Tab
  const [activeTab, setActiveTab] = useState<Tab>("steps");

  // Step modal
  const [showStepModal, setShowStepModal] = useState(false);
  const [editingStepId, setEditingStepId] = useState<number | null>(null);
  const [stepForm, setStepForm] = useState<StepForm>(emptyStepForm);

  // Sorted steps
  const sortedSteps = [...(funnel?.steps ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleStatusChange = (status: Funnel["status"]) => {
    updateFunnel({ id: funnelId, status });
  };

  const openAddStep = () => {
    setStepForm(emptyStepForm);
    setEditingStepId(null);
    setShowStepModal(true);
  };

  const openEditStep = (step: FunnelStep) => {
    setStepForm({ name: step.name, type: step.type, slug: step.slug });
    setEditingStepId(step.id);
    setShowStepModal(true);
  };

  const handleStepSubmit = () => {
    if (!stepForm.name.trim()) return;

    if (editingStepId) {
      updateStep(
        {
          funnelId,
          stepId: editingStepId,
          name: stepForm.name,
          type: stepForm.type,
          slug: stepForm.slug,
        },
        {
          onSuccess: () => {
            setShowStepModal(false);
            setEditingStepId(null);
            setStepForm(emptyStepForm);
          },
        }
      );
    } else {
      const sortOrder = sortedSteps.length + 1;
      createStep(
        {
          funnelId,
          name: stepForm.name,
          type: stepForm.type,
          slug: stepForm.slug || undefined,
          sort_order: sortOrder,
        } as Parameters<typeof createStep>[0],
        {
          onSuccess: () => {
            setShowStepModal(false);
            setStepForm(emptyStepForm);
          },
        }
      );
    }
  };

  const handleDeleteStep = async (stepId: number) => {
    const ok = await confirm({
      title: "Delete Step",
      description: "Delete this step? This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (ok) {
      deleteStep({ funnelId, stepId });
    }
  };

  // -------------------------------------------------------------------------
  // Loading / not found
  // -------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!funnel) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <p className="text-text-secondary">Funnel not found.</p>
        <Link href="/funnels" className="text-accent hover:underline text-sm">
          Back to funnels
        </Link>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Analytics helpers
  // -------------------------------------------------------------------------

  const overallRate = analytics?.overall_rate ?? 0;
  const totalValue = analytics?.total_value ?? 0;
  const analyticsSteps = analytics?.steps ?? [];

  const maxStepVisits = Math.max(
    ...analyticsSteps.map((s) => s.visits),
    1
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/funnels"
          className="rounded-lg p-1.5 hover:bg-bg-hover text-text-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground truncate">
            {funnel.name}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                statusBadge[funnel.status] ?? "bg-bg-elevated text-text-muted"
              }`}
            >
              {funnel.status}
            </span>
            <span className="text-text-muted text-sm">
              {sortedSteps.length} step{sortedSteps.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Status dropdown */}
        <div className="flex items-center gap-2">
          <select
            value={funnel.status}
            onChange={(e) =>
              handleStatusChange(e.target.value as Funnel["status"])
            }
            className="rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-6">
          {(["steps", "analytics"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative pb-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "text-accent"
                  : "text-text-muted hover:text-foreground"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-accent" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* =================================================================== */}
      {/* STEPS TAB                                                           */}
      {/* =================================================================== */}
      {activeTab === "steps" && (
        <div className="space-y-6">
          {/* Pipeline header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Funnel Steps
              </h2>
              <p className="text-sm text-text-muted mt-0.5">
                Build your funnel pipeline by adding and ordering steps.
              </p>
            </div>
            <button
              onClick={openAddStep}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Step
            </button>
          </div>

          {/* Visual step pipeline */}
          {sortedSteps.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-bg-secondary p-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                  <TrendingUp className="h-7 w-7 text-accent" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                No steps yet
              </h3>
              <p className="text-sm text-text-muted mb-5">
                Add your first step to start building the funnel pipeline.
              </p>
              <button
                onClick={openAddStep}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Step
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto pb-4">
              <div className="flex items-start gap-3 min-w-max">
                {sortedSteps.map((step, idx) => (
                  <div key={step.id} className="flex items-start gap-3">
                    {/* Step card */}
                    <div
                      className={`group relative w-56 rounded-xl border-2 bg-bg-secondary p-4 space-y-3 transition-colors hover:bg-bg-hover ${
                        stepCardBorder[step.type] ?? "border-border"
                      }`}
                    >
                      {/* Sort order badge */}
                      <div className="flex items-center justify-between">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-bg-elevated text-xs font-bold text-text-muted">
                          {step.sort_order}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            stepTypeBadge[step.type] ??
                            "bg-bg-elevated text-text-muted"
                          }`}
                        >
                          {step.type}
                        </span>
                      </div>

                      {/* Step name */}
                      <h4 className="font-semibold text-foreground text-sm truncate">
                        {step.name}
                      </h4>

                      {/* Slug */}
                      {step.slug && (
                        <p className="text-xs text-text-muted truncate">
                          /{step.slug}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-1 pt-1 border-t border-border/50">
                        <button
                          onClick={() => openEditStep(step)}
                          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-text-muted hover:bg-bg-elevated hover:text-foreground transition-colors"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteStep(step.id)}
                          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-text-muted hover:bg-danger/10 hover:text-danger transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Arrow connector */}
                    {idx < sortedSteps.length - 1 && (
                      <div className="flex items-center self-center pt-2">
                        <ArrowRight className="h-5 w-5 text-text-muted/50" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Add step button at end of pipeline */}
                <div className="flex items-center self-center pt-2">
                  <ArrowRight className="h-5 w-5 text-text-muted/30 mr-3" />
                  <button
                    onClick={openAddStep}
                    className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-dashed border-border bg-bg-secondary text-text-muted hover:border-accent hover:text-accent hover:bg-accent/5 transition-colors"
                    title="Add step"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* ANALYTICS TAB                                                       */}
      {/* =================================================================== */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* Overall stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-bg-secondary p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <Eye className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-text-muted">Total Visits</p>
                  <p className="text-2xl font-bold text-foreground">
                    {(analytics?.total_visits ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-bg-secondary p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                  <BarChart3 className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-text-muted">Conversions</p>
                  <p className="text-2xl font-bold text-foreground">
                    {(analytics?.total_conversions ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-bg-secondary p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                  <TrendingUp className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-text-muted">Conversion Rate</p>
                  <p className="text-2xl font-bold text-foreground">
                    {overallRate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-bg-secondary p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                  <DollarSign className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-text-muted">Total Value</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${totalValue.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step-by-step funnel visualization */}
          {analyticsSteps.length > 0 ? (
            <div className="rounded-xl border border-border bg-bg-secondary p-6 space-y-6">
              <h2 className="text-lg font-semibold text-foreground">
                Step-by-Step Performance
              </h2>

              <div className="space-y-4">
                {analyticsSteps.map((step, idx) => {
                  const visitPct =
                    maxStepVisits > 0
                      ? (step.visits / maxStepVisits) * 100
                      : 0;
                  const convPct =
                    maxStepVisits > 0
                      ? (step.conversions / maxStepVisits) * 100
                      : 0;

                  return (
                    <div key={step.step_id} className="space-y-2">
                      {/* Step header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-bg-elevated text-xs font-bold text-text-muted">
                            {idx + 1}
                          </span>
                          <span className="font-medium text-foreground text-sm">
                            {step.step_name}
                          </span>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              stepTypeBadge[step.step_type] ??
                              "bg-bg-elevated text-text-muted"
                            }`}
                          >
                            {step.step_type}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {step.conversion_rate.toFixed(1)}%
                        </span>
                      </div>

                      {/* Bars */}
                      <div className="space-y-1.5">
                        {/* Visits bar */}
                        <div className="flex items-center gap-3">
                          <span className="w-20 text-xs text-text-muted text-right shrink-0">
                            {step.visits.toLocaleString()} visits
                          </span>
                          <div className="flex-1 h-5 rounded-full bg-bg-elevated overflow-hidden">
                            <div
                              className="h-full rounded-full bg-accent/60 transition-all duration-500"
                              style={{ width: `${visitPct}%` }}
                            />
                          </div>
                        </div>
                        {/* Conversions bar */}
                        <div className="flex items-center gap-3">
                          <span className="w-20 text-xs text-text-muted text-right shrink-0">
                            {step.conversions.toLocaleString()} conv.
                          </span>
                          <div className="flex-1 h-5 rounded-full bg-bg-elevated overflow-hidden">
                            <div
                              className="h-full rounded-full bg-green-500/60 transition-all duration-500"
                              style={{ width: `${convPct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Separator arrow */}
                      {idx < analyticsSteps.length - 1 && (
                        <div className="flex justify-center py-1">
                          <ArrowRight className="h-4 w-4 text-text-muted/40 rotate-90" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-bg-secondary p-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                  <BarChart3 className="h-7 w-7 text-accent" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                No analytics data yet
              </h3>
              <p className="text-sm text-text-muted">
                Analytics will appear here once your funnel starts receiving
                traffic.
              </p>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* STEP MODAL                                                          */}
      {/* =================================================================== */}
      {showStepModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl border border-border bg-bg-secondary p-6 shadow-2xl mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-foreground">
                {editingStepId ? "Edit Step" : "Add Step"}
              </h2>
              <button
                onClick={() => {
                  setShowStepModal(false);
                  setEditingStepId(null);
                  setStepForm(emptyStepForm);
                }}
                className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={stepForm.name}
                  onChange={(e) =>
                    setStepForm({ ...stepForm, name: e.target.value })
                  }
                  placeholder="Step name"
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Type
                </label>
                <select
                  value={stepForm.type}
                  onChange={(e) =>
                    setStepForm({
                      ...stepForm,
                      type: e.target.value as StepType,
                    })
                  }
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                >
                  {STEP_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  value={stepForm.slug}
                  onChange={(e) =>
                    setStepForm({ ...stepForm, slug: e.target.value })
                  }
                  placeholder="step-slug (auto-generated if empty)"
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowStepModal(false);
                  setEditingStepId(null);
                  setStepForm(emptyStepForm);
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStepSubmit}
                disabled={!stepForm.name.trim()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                {editingStepId ? "Update Step" : "Add Step"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
