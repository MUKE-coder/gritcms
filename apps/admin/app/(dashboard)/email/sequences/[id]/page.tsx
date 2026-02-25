"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  useEmailSequence,
  useUpdateEmailSequence,
  useCreateSequenceStep,
  useUpdateSequenceStep,
  useDeleteSequenceStep,
  useSequenceEnrollments,
  useCancelEnrollment,
} from "@/hooks/use-email";
import { ChevronLeft, Save, Loader2, Plus, Trash2, Pencil } from "@/lib/icons";

interface StepForm {
  subject: string;
  html_content: string;
  delay_days: number;
  delay_hours: number;
  sort_order: number;
}

const emptyStepForm: StepForm = {
  subject: "",
  html_content: "",
  delay_days: 0,
  delay_hours: 0,
  sort_order: 0,
};

export default function SequenceEditorPage() {
  const params = useParams();
  const id = Number(params.id);

  const { data: sequence, isLoading } = useEmailSequence(id);
  const { mutate: updateSequence, isPending: saving } =
    useUpdateEmailSequence();
  const { mutate: createStep } = useCreateSequenceStep();
  const { mutate: updateStep } = useUpdateSequenceStep();
  const { mutate: deleteStep } = useDeleteSequenceStep();
  const { data: enrollments } = useSequenceEnrollments(id);
  const { mutate: cancelEnrollment } = useCancelEnrollment();

  // Sequence settings state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState<"manual" | "event">("manual");
  const [triggerEvent, setTriggerEvent] = useState("");
  const [status, setStatus] = useState<"draft" | "active" | "paused">("draft");
  const [initialized, setInitialized] = useState(false);

  // Step form state
  const [showStepForm, setShowStepForm] = useState(false);
  const [editingStepId, setEditingStepId] = useState<number | null>(null);
  const [stepForm, setStepForm] = useState<StepForm>(emptyStepForm);

  // Enrollments section state
  const [enrollmentsOpen, setEnrollmentsOpen] = useState(false);

  if (sequence && !initialized) {
    setName(sequence.name);
    setDescription(sequence.description || "");
    setTrigger(sequence.trigger);
    setTriggerEvent(sequence.trigger_event || "");
    setStatus(sequence.status);
    setInitialized(true);
  }

  const handleSaveSettings = () => {
    updateSequence({
      id,
      name,
      description,
      trigger,
      trigger_event: trigger === "event" ? triggerEvent : "",
      status,
    });
  };

  const sortedSteps = [...(sequence?.steps ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  const openAddStep = () => {
    const nextOrder =
      sortedSteps.length > 0
        ? Math.max(...sortedSteps.map((s) => s.sort_order)) + 1
        : 1;
    setStepForm({ ...emptyStepForm, sort_order: nextOrder });
    setEditingStepId(null);
    setShowStepForm(true);
  };

  const openEditStep = (stepId: number) => {
    const step = sortedSteps.find((s) => s.id === stepId);
    if (!step) return;
    setStepForm({
      subject: step.subject,
      html_content: step.html_content || "",
      delay_days: step.delay_days,
      delay_hours: step.delay_hours,
      sort_order: step.sort_order,
    });
    setEditingStepId(stepId);
    setShowStepForm(true);
  };

  const handleStepSubmit = () => {
    if (editingStepId) {
      updateStep(
        {
          sequenceId: id,
          stepId: editingStepId,
          subject: stepForm.subject,
          html_content: stepForm.html_content,
          delay_days: stepForm.delay_days,
          delay_hours: stepForm.delay_hours,
          sort_order: stepForm.sort_order,
        },
        {
          onSuccess: () => {
            setShowStepForm(false);
            setEditingStepId(null);
            setStepForm(emptyStepForm);
          },
        }
      );
    } else {
      createStep(
        {
          sequenceId: id,
          subject: stepForm.subject,
          html_content: stepForm.html_content,
          delay_days: stepForm.delay_days,
          delay_hours: stepForm.delay_hours,
          sort_order: stepForm.sort_order,
        },
        {
          onSuccess: () => {
            setShowStepForm(false);
            setStepForm(emptyStepForm);
          },
        }
      );
    }
  };

  const handleDeleteStep = (stepId: number) => {
    if (confirm("Delete this step?")) {
      deleteStep({ sequenceId: id, stepId });
    }
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case "active":
        return "bg-success/10 text-success";
      case "paused":
        return "bg-warning/10 text-warning";
      case "completed":
        return "bg-accent/10 text-accent";
      case "cancelled":
        return "bg-danger/10 text-danger";
      case "draft":
      default:
        return "bg-bg-elevated text-text-muted";
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/email/sequences"
          className="rounded-lg p-1.5 hover:bg-bg-hover text-text-muted"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">
            {sequence?.name || "Sequence"}
          </h1>
          <p className="text-text-secondary mt-1">
            {sortedSteps.length} step{sortedSteps.length !== 1 ? "s" : ""} ·{" "}
            {enrollments?.length ?? 0} enrollment
            {(enrollments?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Sequence Settings */}
      <div className="rounded-xl border border-border bg-bg-secondary p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Sequence Settings
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "draft" | "active" | "paused")
              }
              className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Trigger Type
            </label>
            <select
              value={trigger}
              onChange={(e) =>
                setTrigger(e.target.value as "manual" | "event")
              }
              className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
            >
              <option value="manual">Manual</option>
              <option value="event">Event</option>
            </select>
          </div>
          {trigger === "event" && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Trigger Event
              </label>
              <input
                type="text"
                value={triggerEvent}
                onChange={(e) => setTriggerEvent(e.target.value)}
                placeholder="e.g. user.signed_up"
                className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Steps */}
      <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Steps</h2>
          <button
            onClick={openAddStep}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Step
          </button>
        </div>

        {/* Inline step form */}
        {showStepForm && (
          <div className="border-b border-border bg-bg-elevated p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              {editingStepId ? "Edit Step" : "New Step"}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={stepForm.subject}
                  onChange={(e) =>
                    setStepForm({ ...stepForm, subject: e.target.value })
                  }
                  placeholder="Email subject line"
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  HTML Content
                </label>
                <textarea
                  value={stepForm.html_content}
                  onChange={(e) =>
                    setStepForm({ ...stepForm, html_content: e.target.value })
                  }
                  rows={6}
                  placeholder="<p>Your email content here...</p>"
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground font-mono focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Delay Days
                </label>
                <input
                  type="number"
                  min={0}
                  value={stepForm.delay_days}
                  onChange={(e) =>
                    setStepForm({
                      ...stepForm,
                      delay_days: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Delay Hours
                </label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={stepForm.delay_hours}
                  onChange={(e) =>
                    setStepForm({
                      ...stepForm,
                      delay_hours: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  min={0}
                  value={stepForm.sort_order}
                  onChange={(e) =>
                    setStepForm({
                      ...stepForm,
                      sort_order: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => {
                  setShowStepForm(false);
                  setEditingStepId(null);
                  setStepForm(emptyStepForm);
                }}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover"
              >
                Cancel
              </button>
              <button
                onClick={handleStepSubmit}
                disabled={!stepForm.subject.trim()}
                className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
              >
                {editingStepId ? "Update Step" : "Add Step"}
              </button>
            </div>
          </div>
        )}

        {/* Steps timeline */}
        {sortedSteps.length > 0 ? (
          <div className="divide-y divide-border/50">
            {sortedSteps.map((step, idx) => (
              <div
                key={step.id}
                className="flex items-start gap-4 px-4 py-3 hover:bg-bg-hover transition-colors"
              >
                {/* Timeline indicator */}
                <div className="flex flex-col items-center pt-1">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-accent text-xs font-bold">
                    {step.sort_order}
                  </div>
                  {idx < sortedSteps.length - 1 && (
                    <div className="mt-1 h-full w-px bg-border flex-1 min-h-[16px]" />
                  )}
                </div>

                {/* Step content */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {step.subject}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    Delay:{" "}
                    {step.delay_days > 0
                      ? `${step.delay_days} day${step.delay_days !== 1 ? "s" : ""}`
                      : ""}
                    {step.delay_days > 0 && step.delay_hours > 0 ? " " : ""}
                    {step.delay_hours > 0
                      ? `${step.delay_hours} hour${step.delay_hours !== 1 ? "s" : ""}`
                      : ""}
                    {step.delay_days === 0 && step.delay_hours === 0
                      ? "Immediate"
                      : ""}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEditStep(step.id)}
                    className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteStep(step.id)}
                    className="rounded-lg p-1.5 text-text-muted hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-text-muted">
            No steps yet. Add your first step to get started.
          </div>
        )}
      </div>

      {/* Enrollments (collapsible) */}
      <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
        <button
          onClick={() => setEnrollmentsOpen(!enrollmentsOpen)}
          className="flex w-full items-center justify-between px-4 py-3 border-b border-border hover:bg-bg-hover transition-colors"
        >
          <h2 className="text-lg font-semibold text-foreground">
            Enrollments ({enrollments?.length ?? 0})
          </h2>
          <svg
            className={`h-5 w-5 text-text-muted transition-transform ${enrollmentsOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {enrollmentsOpen && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-elevated">
                <th className="px-4 py-3 text-left font-medium text-text-muted">
                  Contact
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">
                  Current Step
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">
                  Next Send
                </th>
                <th className="px-4 py-3 text-right font-medium text-text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {enrollments?.map((enrollment) => (
                <tr
                  key={enrollment.id}
                  className="border-b border-border/50 hover:bg-bg-hover transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">
                      {enrollment.contact?.first_name}{" "}
                      {enrollment.contact?.last_name}
                    </p>
                    <p className="text-xs text-text-muted">
                      {enrollment.contact?.email}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(enrollment.status)}`}
                    >
                      {enrollment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {enrollment.current_step
                      ? `Step ${enrollment.current_step.sort_order}`
                      : "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {enrollment.next_send_at
                      ? new Date(enrollment.next_send_at).toLocaleString()
                      : "\u2014"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      {enrollment.status === "active" && (
                        <button
                          onClick={() => {
                            if (confirm("Cancel this enrollment?"))
                              cancelEnrollment({
                                sequenceId: id,
                                enrollId: enrollment.id,
                              });
                          }}
                          className="rounded-lg px-2.5 py-1 text-xs font-medium text-danger border border-danger/30 hover:bg-danger/10 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {(!enrollments || enrollments.length === 0) && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-text-muted"
                  >
                    No enrollments yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
