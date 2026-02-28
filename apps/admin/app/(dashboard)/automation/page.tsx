"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Pencil,
  Search,
  Loader2,
  Zap,
  X,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Play,
} from "@/lib/icons";
import {
  useWorkflows,
  useCreateWorkflow,
  useDeleteWorkflow,
  useExecutions,
} from "@/hooks/use-workflows";
import { useConfirm } from "@/hooks/use-confirm";
import type { Workflow, WorkflowExecution } from "@repo/shared/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MainTab = "workflows" | "executions";
type StatusFilter = "" | "draft" | "active" | "paused";
type ExecStatusFilter = "" | "running" | "completed" | "failed";
type TriggerType = "event" | "schedule" | "manual";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusBadge(status: string) {
  switch (status) {
    case "active":
      return "bg-success/10 text-success";
    case "paused":
      return "bg-bg-elevated text-text-muted";
    case "draft":
    default:
      return "bg-warning/10 text-warning";
  }
}

function triggerBadge(trigger: string) {
  switch (trigger) {
    case "event":
      return "bg-accent/10 text-accent";
    case "schedule":
      return "bg-purple-500/10 text-purple-400";
    case "manual":
    default:
      return "bg-bg-elevated text-text-muted";
  }
}

function execStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return "bg-success/10 text-success";
    case "failed":
      return "bg-danger/10 text-danger";
    case "running":
    default:
      return "bg-accent/10 text-accent";
  }
}

function triggerIcon(trigger: string) {
  switch (trigger) {
    case "event":
      return <Zap className="h-3.5 w-3.5" />;
    case "schedule":
      return <Calendar className="h-3.5 w-3.5" />;
    case "manual":
    default:
      return <Play className="h-3.5 w-3.5" />;
  }
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function AutomationPage() {
  const confirm = useConfirm();
  // Tab state
  const [mainTab, setMainTab] = useState<MainTab>("workflows");

  // Workflow list state
  const [wfPage, setWfPage] = useState(1);
  const [wfSearch, setWfSearch] = useState("");
  const [wfStatus, setWfStatus] = useState<StatusFilter>("");

  // Execution log state
  const [execPage, setExecPage] = useState(1);
  const [execStatus, setExecStatus] = useState<ExecStatusFilter>("");

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newTriggerType, setNewTriggerType] = useState<TriggerType>("event");
  const [newTriggerConfig, setNewTriggerConfig] = useState("");

  // Data
  const { data: wfData, isLoading: wfLoading } = useWorkflows(
    wfPage,
    wfSearch,
    wfStatus
  );
  const { mutate: createWorkflow } = useCreateWorkflow();
  const { mutate: deleteWorkflow } = useDeleteWorkflow();
  const { data: execData, isLoading: execLoading } = useExecutions(
    execPage,
    "",
    execStatus
  );

  const workflows = wfData?.data ?? [];
  const wfMeta = wfData?.meta;
  const executions = execData?.data ?? [];
  const execMeta = execData?.meta;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleCreate = () => {
    let triggerConfig: Record<string, unknown> = {};
    if (newTriggerType === "event") {
      triggerConfig = { event_name: newTriggerConfig };
    } else if (newTriggerType === "schedule") {
      triggerConfig = { cron: newTriggerConfig };
    } else {
      // For manual, try parsing JSON, otherwise empty
      try {
        triggerConfig = newTriggerConfig ? JSON.parse(newTriggerConfig) : {};
      } catch {
        triggerConfig = {};
      }
    }

    createWorkflow(
      {
        name: newName,
        description: newDesc,
        trigger_type: newTriggerType,
        trigger_config: triggerConfig,
        status: "draft",
      },
      {
        onSuccess: () => {
          setShowCreate(false);
          setNewName("");
          setNewDesc("");
          setNewTriggerType("event");
          setNewTriggerConfig("");
        },
      }
    );
  };

  const handleDelete = async (id: number) => {
    const ok = await confirm({
      title: "Delete Workflow",
      description: "Delete this workflow? This action cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (ok) {
      deleteWorkflow(id);
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
          <h1 className="text-2xl font-bold text-foreground">Automation</h1>
          <p className="text-text-secondary mt-1">
            Build workflows to automate actions based on events, schedules, or
            manual triggers.
          </p>
        </div>
        {mainTab === "workflows" && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Workflow
          </button>
        )}
      </div>

      {/* Main Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-6">
          {(
            [
              { key: "workflows", label: "Workflows" },
              { key: "executions", label: "Execution Log" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setMainTab(tab.key)}
              className={`relative pb-3 text-sm font-medium transition-colors ${
                mainTab === tab.key
                  ? "text-accent"
                  : "text-text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
              {mainTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-accent" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ================================================================= */}
      {/* WORKFLOWS TAB                                                     */}
      {/* ================================================================= */}
      {mainTab === "workflows" && (
        <div className="space-y-4">
          {/* Search + Status filter */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search workflows..."
                value={wfSearch}
                onChange={(e) => {
                  setWfSearch(e.target.value);
                  setWfPage(1);
                }}
                className="w-full rounded-lg border border-border bg-bg-secondary py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none"
              />
            </div>

            <div className="flex gap-1">
              {(
                [
                  { key: "", label: "All" },
                  { key: "draft", label: "Draft" },
                  { key: "active", label: "Active" },
                  { key: "paused", label: "Paused" },
                ] as const
              ).map((f) => (
                <button
                  key={f.key}
                  onClick={() => {
                    setWfStatus(f.key as StatusFilter);
                    setWfPage(1);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    wfStatus === f.key
                      ? "bg-accent text-white"
                      : "text-text-muted hover:bg-bg-hover hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Workflow list */}
          {wfLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : workflows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-bg-secondary p-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                  <Zap className="h-7 w-7 text-accent" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                No workflows yet
              </h3>
              <p className="text-sm text-text-muted mb-5">
                Create your first automation workflow to get started.
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Workflow
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {workflows.map((wf: Workflow) => (
                <div
                  key={wf.id}
                  className="rounded-xl border border-border bg-bg-secondary p-4 hover:bg-bg-hover transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 shrink-0">
                      <Zap className="h-5 w-5 text-accent" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/automation/${wf.id}`}
                          className="font-semibold text-foreground hover:text-accent transition-colors"
                        >
                          {wf.name}
                        </Link>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusBadge(wf.status)}`}
                        >
                          {wf.status}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${triggerBadge(wf.trigger_type)}`}
                        >
                          {triggerIcon(wf.trigger_type)}
                          {wf.trigger_type}
                        </span>
                      </div>

                      {wf.description && (
                        <p className="text-sm text-text-muted mt-1 line-clamp-1">
                          {wf.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                        <span>
                          {wf.actions?.length ?? 0} action
                          {(wf.actions?.length ?? 0) !== 1 ? "s" : ""}
                        </span>
                        <span>
                          {wf.execution_count ?? 0} execution
                          {(wf.execution_count ?? 0) !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Link
                        href={`/automation/${wf.id}`}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-bg-elevated hover:text-foreground transition-colors"
                        title="Edit workflow"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(wf.id)}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-danger/10 hover:text-danger transition-colors"
                        title="Delete workflow"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {wfMeta && wfMeta.pages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-sm text-text-muted">
                    Page {wfMeta.page} of {wfMeta.pages} ({wfMeta.total} total)
                  </p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setWfPage((p) => Math.max(1, p - 1))}
                      disabled={wfMeta.page <= 1}
                      className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover disabled:opacity-40 transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() =>
                        setWfPage((p) => Math.min(wfMeta.pages, p + 1))
                      }
                      disabled={wfMeta.page >= wfMeta.pages}
                      className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover disabled:opacity-40 transition-colors"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* EXECUTION LOG TAB                                                 */}
      {/* ================================================================= */}
      {mainTab === "executions" && (
        <div className="space-y-4">
          {/* Status filter */}
          <div className="flex gap-1">
            {(
              [
                { key: "", label: "All" },
                { key: "running", label: "Running" },
                { key: "completed", label: "Completed" },
                { key: "failed", label: "Failed" },
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                onClick={() => {
                  setExecStatus(f.key as ExecStatusFilter);
                  setExecPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  execStatus === f.key
                    ? "bg-accent text-white"
                    : "text-text-muted hover:bg-bg-hover hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Executions table */}
          {execLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-elevated">
                    <th className="px-4 py-3 text-left font-medium text-text-muted">
                      Workflow
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-text-muted">
                      Contact
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-text-muted">
                      Trigger
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-text-muted">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-text-muted">
                      Started
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-text-muted">
                      Completed
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {executions.map((exec: WorkflowExecution) => (
                    <tr
                      key={exec.id}
                      className="border-b border-border/50 hover:bg-bg-hover transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-foreground">
                          {exec.workflow?.name ?? `Workflow #${exec.workflow_id}`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {exec.contact ? (
                          <div>
                            <p className="text-foreground">
                              {exec.contact.first_name} {exec.contact.last_name}
                            </p>
                            <p className="text-xs text-text-muted">
                              {exec.contact.email}
                            </p>
                          </div>
                        ) : (
                          <span className="text-text-muted">
                            Contact #{exec.contact_id}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {exec.trigger_event || "\u2014"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${execStatusBadge(exec.status)}`}
                        >
                          {exec.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {exec.started_at
                          ? new Date(exec.started_at).toLocaleString()
                          : "\u2014"}
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {exec.completed_at
                          ? new Date(exec.completed_at).toLocaleString()
                          : "\u2014"}
                      </td>
                    </tr>
                  ))}
                  {executions.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-text-muted"
                      >
                        No executions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {execMeta && execMeta.pages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-text-muted">
                Page {execMeta.page} of {execMeta.pages} ({execMeta.total}{" "}
                total)
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setExecPage((p) => Math.max(1, p - 1))}
                  disabled={execMeta.page <= 1}
                  className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() =>
                    setExecPage((p) => Math.min(execMeta.pages, p + 1))
                  }
                  disabled={execMeta.page >= execMeta.pages}
                  className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* CREATE WORKFLOW MODAL                                             */}
      {/* ================================================================= */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-bg-elevated p-6 shadow-2xl mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-foreground">
                Create Workflow
              </h2>
              <button
                onClick={() => setShowCreate(false)}
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
                  placeholder="Workflow name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Description
                </label>
                <textarea
                  placeholder="What does this workflow do? (optional)"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none resize-y"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Trigger Type
                </label>
                <select
                  value={newTriggerType}
                  onChange={(e) =>
                    setNewTriggerType(e.target.value as TriggerType)
                  }
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="event">Event</option>
                  <option value="schedule">Schedule</option>
                  <option value="manual">Manual</option>
                </select>
              </div>

              {newTriggerType === "event" && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Event Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. contact.created, order.completed"
                    value={newTriggerConfig}
                    onChange={(e) => setNewTriggerConfig(e.target.value)}
                    className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  />
                </div>
              )}

              {newTriggerType === "schedule" && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Cron Expression
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 0 9 * * 1 (every Monday 9am)"
                    value={newTriggerConfig}
                    onChange={(e) => setNewTriggerConfig(e.target.value)}
                    className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground font-mono focus:border-accent focus:outline-none"
                  />
                </div>
              )}

              {newTriggerType === "manual" && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Trigger Config (JSON, optional)
                  </label>
                  <textarea
                    placeholder='{"key": "value"}'
                    value={newTriggerConfig}
                    onChange={(e) => setNewTriggerConfig(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground font-mono focus:border-accent focus:outline-none resize-y"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover transition-colors"
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
    </div>
  );
}
