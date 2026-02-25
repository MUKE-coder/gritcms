"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Pencil,
  X,
  Zap,
  Mail,
  Tag,
  Minus,
  GraduationCap,
  Clock,
  Globe,
  UserCog,
  FileText,
  GitBranch,
  Play,
  Calendar,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "@/lib/icons";
import {
  useWorkflow,
  useUpdateWorkflow,
  useCreateAction,
  useUpdateAction,
  useDeleteAction,
  useTriggerWorkflow,
  useExecutions,
} from "@/hooks/use-workflows";
import type { WorkflowAction, WorkflowExecution } from "@repo/shared/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = "actions" | "executions";

type ActionType =
  | "send_email"
  | "add_tag"
  | "remove_tag"
  | "enroll_course"
  | "add_to_list"
  | "remove_from_list"
  | "wait"
  | "webhook"
  | "update_contact"
  | "create_note"
  | "condition";

interface ActionForm {
  type: ActionType;
  config: string;
  delay_seconds: number;
}

const emptyActionForm: ActionForm = {
  type: "send_email",
  config: "{}",
  delay_seconds: 0,
};

// ---------------------------------------------------------------------------
// Action type metadata
// ---------------------------------------------------------------------------

const ACTION_TYPES: {
  value: ActionType;
  label: string;
  icon: typeof Mail;
  color: string;
}[] = [
  { value: "send_email", label: "Send Email", icon: Mail, color: "bg-accent/10 text-accent" },
  { value: "add_tag", label: "Add Tag", icon: Tag, color: "bg-success/10 text-success" },
  { value: "remove_tag", label: "Remove Tag", icon: Tag, color: "bg-warning/10 text-warning" },
  { value: "enroll_course", label: "Enroll in Course", icon: GraduationCap, color: "bg-purple-500/10 text-purple-400" },
  { value: "add_to_list", label: "Add to List", icon: Plus, color: "bg-success/10 text-success" },
  { value: "remove_from_list", label: "Remove from List", icon: Minus, color: "bg-danger/10 text-danger" },
  { value: "wait", label: "Wait / Delay", icon: Clock, color: "bg-warning/10 text-warning" },
  { value: "webhook", label: "Webhook", icon: Globe, color: "bg-accent/10 text-accent" },
  { value: "update_contact", label: "Update Contact", icon: UserCog, color: "bg-purple-500/10 text-purple-400" },
  { value: "create_note", label: "Create Note", icon: FileText, color: "bg-bg-elevated text-text-muted" },
  { value: "condition", label: "Condition", icon: GitBranch, color: "bg-warning/10 text-warning" },
];

function getActionMeta(type: string) {
  return ACTION_TYPES.find((a) => a.value === type) ?? ACTION_TYPES[0]!;
}

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

function formatDelay(seconds: number): string {
  if (seconds <= 0) return "";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  if (parts.length === 0) parts.push(`${seconds}s`);
  return `Wait ${parts.join(" ")}`;
}

function configSummary(type: string, config: Record<string, unknown>): string {
  if (!config || Object.keys(config).length === 0) return "No config";
  switch (type) {
    case "send_email":
      return (config.template_name as string) || (config.subject as string) || "Email action";
    case "add_tag":
    case "remove_tag":
      return (config.tag_name as string) || (config.tag as string) || "Tag action";
    case "enroll_course":
      return (config.course_name as string) || `Course #${config.course_id ?? "?"}`;
    case "add_to_list":
    case "remove_from_list":
      return (config.list_name as string) || `List #${config.list_id ?? "?"}`;
    case "wait":
      return config.duration ? `${config.duration}` : "Wait step";
    case "webhook":
      return (config.url as string) || "Webhook call";
    case "update_contact":
      return config.field ? `Set ${config.field}` : "Update fields";
    case "create_note":
      return (config.title as string) || "Create note";
    case "condition":
      return (config.field as string) ? `If ${config.field} ${config.operator ?? "=="} ${config.value ?? ""}` : "Condition check";
    default:
      return JSON.stringify(config).slice(0, 50);
  }
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function WorkflowEditorPage() {
  const params = useParams();
  const id = Number(params.id);

  // Data
  const { data: workflow, isLoading } = useWorkflow(id);
  const { mutate: updateWorkflow, isPending: updatingStatus } = useUpdateWorkflow();
  const { mutate: createAction } = useCreateAction();
  const { mutate: updateAction } = useUpdateAction();
  const { mutate: deleteAction } = useDeleteAction();
  const { mutate: triggerWorkflow, isPending: triggering } = useTriggerWorkflow();

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>("actions");

  // Action modal state
  const [showActionModal, setShowActionModal] = useState(false);
  const [editingActionId, setEditingActionId] = useState<number | null>(null);
  const [actionForm, setActionForm] = useState<ActionForm>(emptyActionForm);

  // Test modal state
  const [showTestModal, setShowTestModal] = useState(false);
  const [testContactId, setTestContactId] = useState("");

  // Execution log state
  const [execPage, setExecPage] = useState(1);
  const [execStatus, setExecStatus] = useState<"" | "running" | "completed" | "failed">("");
  const [expandedExecId, setExpandedExecId] = useState<number | null>(null);

  const { data: execData, isLoading: execLoading } = useExecutions(
    execPage,
    id > 0 ? String(id) : "",
    execStatus
  );

  const executions = execData?.data ?? [];
  const execMeta = execData?.meta;

  // Sorted actions
  const sortedActions = [...(workflow?.actions ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleStatusChange = (newStatus: "draft" | "active" | "paused") => {
    updateWorkflow({ id, status: newStatus });
  };

  const openAddAction = () => {
    setActionForm(emptyActionForm);
    setEditingActionId(null);
    setShowActionModal(true);
  };

  const openEditAction = (action: WorkflowAction) => {
    setActionForm({
      type: action.type as ActionType,
      config: JSON.stringify(action.config ?? {}, null, 2),
      delay_seconds: action.delay_seconds,
    });
    setEditingActionId(action.id);
    setShowActionModal(true);
  };

  const handleActionSubmit = () => {
    let parsedConfig: Record<string, unknown> = {};
    try {
      parsedConfig = JSON.parse(actionForm.config);
    } catch {
      parsedConfig = {};
    }

    if (editingActionId) {
      updateAction(
        {
          workflowId: id,
          actionId: editingActionId,
          type: actionForm.type,
          config: parsedConfig,
          delay_seconds: actionForm.delay_seconds,
        },
        {
          onSuccess: () => {
            setShowActionModal(false);
            setEditingActionId(null);
            setActionForm(emptyActionForm);
          },
        }
      );
    } else {
      createAction(
        {
          workflowId: id,
          type: actionForm.type,
          config: parsedConfig,
          delay_seconds: actionForm.delay_seconds,
        },
        {
          onSuccess: () => {
            setShowActionModal(false);
            setActionForm(emptyActionForm);
          },
        }
      );
    }
  };

  const handleDeleteAction = (actionId: number) => {
    if (confirm("Remove this action?")) {
      deleteAction({ workflowId: id, actionId });
    }
  };

  const handleTestWorkflow = () => {
    const contactId = parseInt(testContactId);
    if (!contactId || contactId <= 0) return;
    triggerWorkflow(
      { id, contactId },
      {
        onSuccess: () => {
          setShowTestModal(false);
          setTestContactId("");
        },
      }
    );
  };

  // ---------------------------------------------------------------------------
  // Loading / Not found
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <p className="text-text-secondary">Workflow not found.</p>
        <Link href="/automation" className="text-accent hover:underline text-sm">
          Back to Automation
        </Link>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Trigger info
  // ---------------------------------------------------------------------------

  const triggerLabel =
    workflow.trigger_type === "event"
      ? "Event Trigger"
      : workflow.trigger_type === "schedule"
        ? "Scheduled Trigger"
        : "Manual Trigger";

  const triggerDetail = (() => {
    const cfg = workflow.trigger_config;
    if (!cfg || Object.keys(cfg).length === 0) return "No configuration";
    if (workflow.trigger_type === "event")
      return (cfg.event_name as string) || JSON.stringify(cfg);
    if (workflow.trigger_type === "schedule")
      return (cfg.cron as string) || JSON.stringify(cfg);
    return JSON.stringify(cfg);
  })();

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/automation"
          className="rounded-lg p-1.5 hover:bg-bg-hover text-text-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground truncate">
              {workflow.name}
            </h1>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadge(workflow.status)}`}
            >
              {workflow.status}
            </span>
          </div>
          {workflow.description && (
            <p className="text-text-secondary mt-1 line-clamp-1">
              {workflow.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Status dropdown */}
          <select
            value={workflow.status}
            onChange={(e) =>
              handleStatusChange(
                e.target.value as "draft" | "active" | "paused"
              )
            }
            disabled={updatingStatus}
            className="rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none disabled:opacity-50"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>

          {/* Test button */}
          <button
            onClick={() => setShowTestModal(true)}
            className="flex items-center gap-2 rounded-lg border border-accent/30 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/10 transition-colors"
          >
            <Play className="h-4 w-4" />
            Test Workflow
          </button>
        </div>
      </div>

      {/* Trigger info card */}
      <div className="rounded-xl border border-border bg-bg-secondary p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 shrink-0">
            {workflow.trigger_type === "event" ? (
              <Zap className="h-5 w-5 text-accent" />
            ) : workflow.trigger_type === "schedule" ? (
              <Calendar className="h-5 w-5 text-accent" />
            ) : (
              <Play className="h-5 w-5 text-accent" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{triggerLabel}</p>
            <p className="text-xs text-text-muted mt-0.5">{triggerDetail}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-6">
          {(
            [
              { key: "actions", label: "Actions" },
              { key: "executions", label: "Executions" },
            ] as const
          ).map((tab) => (
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
      {/* ACTIONS TAB - Visual Workflow Builder                             */}
      {/* ================================================================= */}
      {activeTab === "actions" && (
        <div className="space-y-0">
          {/* Trigger block */}
          <div className="flex flex-col items-center">
            <div className="w-full max-w-lg rounded-xl border-2 border-accent/30 bg-bg-secondary p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 shrink-0">
                  {workflow.trigger_type === "event" ? (
                    <Zap className="h-5 w-5 text-accent" />
                  ) : workflow.trigger_type === "schedule" ? (
                    <Calendar className="h-5 w-5 text-accent" />
                  ) : (
                    <Play className="h-5 w-5 text-accent" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-accent">Trigger</p>
                  <p className="text-xs text-text-muted mt-0.5 truncate">
                    {triggerLabel}: {triggerDetail}
                  </p>
                </div>
              </div>
            </div>

            {/* Connector arrow */}
            {sortedActions.length > 0 && (
              <div className="flex flex-col items-center py-1">
                <div className="h-6 w-px bg-border" />
                <ArrowDown className="h-4 w-4 text-text-muted -mt-1" />
              </div>
            )}
          </div>

          {/* Action blocks */}
          {sortedActions.map((action, idx) => {
            const meta = getActionMeta(action.type);
            const Icon = meta.icon;

            return (
              <div key={action.id} className="flex flex-col items-center">
                {/* Delay badge (shown above the action if delay > 0) */}
                {action.delay_seconds > 0 && (
                  <div className="mb-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning">
                      <Clock className="h-3 w-3" />
                      {formatDelay(action.delay_seconds)}
                    </span>
                  </div>
                )}

                {/* Action card */}
                <div className="w-full max-w-lg rounded-xl border border-border bg-bg-secondary p-4 hover:bg-bg-hover transition-colors group">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${meta.color}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {meta.label}
                        </p>
                        <span className="text-xs text-text-muted">
                          #{action.sort_order}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted mt-0.5 truncate">
                        {configSummary(action.type, action.config)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditAction(action)}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-bg-elevated hover:text-foreground transition-colors"
                        title="Edit action"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAction(action.id)}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-danger/10 hover:text-danger transition-colors"
                        title="Remove action"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Connector arrow */}
                {idx < sortedActions.length - 1 && (
                  <div className="flex flex-col items-center py-1">
                    <div className="h-6 w-px bg-border" />
                    <ArrowDown className="h-4 w-4 text-text-muted -mt-1" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Add action button */}
          <div className="flex flex-col items-center pt-4">
            {sortedActions.length > 0 && (
              <div className="flex flex-col items-center pb-2">
                <div className="h-6 w-px bg-border" />
                <ArrowDown className="h-4 w-4 text-text-muted -mt-1" />
              </div>
            )}
            <button
              onClick={openAddAction}
              className="flex items-center gap-2 rounded-xl border-2 border-dashed border-border bg-bg-secondary px-6 py-3 text-sm font-medium text-text-muted hover:border-accent hover:text-accent hover:bg-accent/5 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Action
            </button>
          </div>

          {/* Empty state */}
          {sortedActions.length === 0 && (
            <div className="text-center pt-4">
              <p className="text-sm text-text-muted">
                No actions yet. Add your first action to build this workflow.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* EXECUTIONS TAB                                                    */}
      {/* ================================================================= */}
      {activeTab === "executions" && (
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
                  setExecStatus(f.key as typeof execStatus);
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

          {execLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-elevated">
                    <th className="px-4 py-3 text-left font-medium text-text-muted w-8" />
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
                    <>
                      <tr
                        key={exec.id}
                        onClick={() =>
                          setExpandedExecId(
                            expandedExecId === exec.id ? null : exec.id
                          )
                        }
                        className="border-b border-border/50 hover:bg-bg-hover transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <ChevronDown
                            className={`h-4 w-4 text-text-muted transition-transform ${
                              expandedExecId === exec.id ? "rotate-0" : "-rotate-90"
                            }`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          {exec.contact ? (
                            <div>
                              <p className="text-foreground">
                                {exec.contact.first_name}{" "}
                                {exec.contact.last_name}
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
                      {expandedExecId === exec.id && (
                        <tr key={`${exec.id}-log`}>
                          <td
                            colSpan={6}
                            className="px-4 py-4 bg-bg-elevated border-b border-border/50"
                          >
                            <div>
                              <p className="text-xs font-medium text-text-secondary mb-2">
                                Execution Log
                              </p>
                              <pre className="rounded-lg bg-bg-secondary border border-border p-3 text-xs text-text-muted font-mono overflow-x-auto max-h-64 overflow-y-auto">
                                {exec.log
                                  ? JSON.stringify(exec.log, null, 2)
                                  : "No log data available."}
                              </pre>
                              <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                                <span>
                                  Current Step: {exec.current_step ?? 0}
                                </span>
                                <span>
                                  Execution ID: {exec.id}
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                  {executions.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-text-muted"
                      >
                        No executions found for this workflow.
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
      {/* ADD / EDIT ACTION MODAL                                           */}
      {/* ================================================================= */}
      {showActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl border border-border bg-bg-elevated p-6 shadow-2xl mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-foreground">
                {editingActionId ? "Edit Action" : "Add Action"}
              </h2>
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setEditingActionId(null);
                  setActionForm(emptyActionForm);
                }}
                className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Action Type
                </label>
                <select
                  value={actionForm.type}
                  onChange={(e) =>
                    setActionForm({
                      ...actionForm,
                      type: e.target.value as ActionType,
                    })
                  }
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                >
                  {ACTION_TYPES.map((at) => (
                    <option key={at.value} value={at.value}>
                      {at.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Configuration (JSON)
                </label>
                <textarea
                  value={actionForm.config}
                  onChange={(e) =>
                    setActionForm({ ...actionForm, config: e.target.value })
                  }
                  rows={6}
                  placeholder='{"key": "value"}'
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground font-mono focus:border-accent focus:outline-none resize-y"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Delay (seconds)
                </label>
                <input
                  type="number"
                  min={0}
                  value={actionForm.delay_seconds}
                  onChange={(e) =>
                    setActionForm({
                      ...actionForm,
                      delay_seconds: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
                {actionForm.delay_seconds > 0 && (
                  <p className="text-xs text-text-muted mt-1">
                    {formatDelay(actionForm.delay_seconds)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setEditingActionId(null);
                  setActionForm(emptyActionForm);
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleActionSubmit}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                {editingActionId ? "Update Action" : "Add Action"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TEST WORKFLOW MODAL                                               */}
      {/* ================================================================= */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl border border-border bg-bg-elevated p-6 shadow-2xl mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-foreground">
                Test Workflow
              </h2>
              <button
                onClick={() => {
                  setShowTestModal(false);
                  setTestContactId("");
                }}
                className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Contact ID
                </label>
                <input
                  type="number"
                  min={1}
                  placeholder="Enter a contact ID to test with"
                  value={testContactId}
                  onChange={(e) => setTestContactId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  autoFocus
                />
                <p className="text-xs text-text-muted mt-1">
                  This will trigger the workflow for the specified contact.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowTestModal(false);
                  setTestContactId("");
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTestWorkflow}
                disabled={!testContactId || parseInt(testContactId) <= 0 || triggering}
                className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                <Play className="h-4 w-4" />
                {triggering ? "Triggering..." : "Trigger"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
