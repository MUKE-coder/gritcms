"use client";

import { useState } from "react";
import {
  useSegments,
  useDeleteSegment,
  useCreateSegment,
  useUpdateSegment,
} from "@/hooks/use-email";
import { Plus, Trash2, Pencil, Search, Loader2, Users, Eye, X } from "@/lib/icons";
import type { Segment, SegmentRule, SegmentRuleGroup, SegmentType } from "@repo/shared/types";

// ---------------------------------------------------------------------------
// Field / operator configuration
// ---------------------------------------------------------------------------

type FieldKey =
  | "email"
  | "first_name"
  | "last_name"
  | "source"
  | "country"
  | "tag"
  | "subscribed_to_list"
  | "created_after"
  | "created_before";

const FIELD_OPTIONS: { value: FieldKey; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "first_name", label: "First Name" },
  { value: "last_name", label: "Last Name" },
  { value: "source", label: "Source" },
  { value: "country", label: "Country" },
  { value: "tag", label: "Tag" },
  { value: "subscribed_to_list", label: "Subscribed to List" },
  { value: "created_after", label: "Created After" },
  { value: "created_before", label: "Created Before" },
];

const FIELD_OPERATORS: Record<FieldKey, { value: string; label: string }[]> = {
  email: [
    { value: "contains", label: "contains" },
    { value: "equals", label: "equals" },
    { value: "ends_with", label: "ends with" },
  ],
  first_name: [
    { value: "contains", label: "contains" },
    { value: "equals", label: "equals" },
  ],
  last_name: [
    { value: "contains", label: "contains" },
    { value: "equals", label: "equals" },
  ],
  source: [{ value: "equals", label: "equals" }],
  country: [{ value: "equals", label: "equals" }],
  tag: [
    { value: "has_tag", label: "has tag" },
    { value: "has_no_tag", label: "does not have tag" },
  ],
  subscribed_to_list: [{ value: "equals", label: "equals" }],
  created_after: [{ value: "equals", label: "equals" }],
  created_before: [{ value: "equals", label: "equals" }],
};

const DATE_FIELDS: FieldKey[] = ["created_after", "created_before"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyRule(): SegmentRule {
  return { field: "email", operator: "contains", value: "" };
}

function defaultRuleGroup(): SegmentRuleGroup {
  return { operator: "and", rules: [emptyRule()] };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EmailSegmentsPage() {
  const { data: segments, isLoading } = useSegments();
  const { mutate: deleteSegment } = useDeleteSegment();
  const { mutate: createSegment, isPending: isCreating } = useCreateSegment();
  const { mutate: updateSegment, isPending: isUpdating } = useUpdateSegment();

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState<SegmentType>("dynamic");
  const [rules, setRules] = useState<SegmentRule[]>([emptyRule()]);

  // ---- Filtering ----
  const filtered = segments?.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  // ---- Modal helpers ----
  function openCreate() {
    setEditingId(null);
    setName("");
    setType("dynamic");
    setRules([emptyRule()]);
    setModalOpen(true);
  }

  function openEdit(seg: Segment) {
    setEditingId(seg.id);
    setName(seg.name);
    setType(seg.type);
    setRules(
      seg.rules && seg.rules.rules.length > 0
        ? seg.rules.rules.map((r) => ({ ...r }))
        : [emptyRule()]
    );
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
  }

  // ---- Rule manipulation ----
  function updateRule(index: number, patch: Partial<SegmentRule>) {
    setRules((prev) => {
      const next = [...prev];
      const updated = { ...next[index], ...patch };

      // When the field changes, reset operator to first available for that field
      if (patch.field) {
        const ops = FIELD_OPERATORS[patch.field as FieldKey];
        if (ops && !ops.some((o) => o.value === updated.operator)) {
          updated.operator = ops[0].value;
        }
        // Reset value when switching to/from date fields
        updated.value = "";
      }

      next[index] = updated;
      return next;
    });
  }

  function removeRule(index: number) {
    setRules((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function addRule() {
    setRules((prev) => [...prev, emptyRule()]);
  }

  // ---- Submit ----
  function handleSubmit() {
    const ruleGroup: SegmentRuleGroup = {
      operator: "and",
      rules: rules.filter((r) => r.value.trim() !== ""),
    };

    const body: Partial<Segment> = {
      name: name.trim(),
      type,
      rules: ruleGroup,
    };

    if (editingId) {
      updateSegment(
        { id: editingId, ...body },
        { onSuccess: closeModal }
      );
    } else {
      createSegment(body, { onSuccess: closeModal });
    }
  }

  const isSaving = isCreating || isUpdating;

  // ---- Render ----
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Segments</h1>
          <p className="text-text-secondary mt-1">
            Build audience segments based on contact attributes.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Segment
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Search segments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-bg-secondary py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none"
        />
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-bg-elevated p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-foreground">
              {editingId ? "Edit Segment" : "Create Segment"}
            </h2>

            {/* Name */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-secondary">Name</label>
              <input
                type="text"
                placeholder="Segment name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </div>

            {/* Type */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-secondary">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as SegmentType)}
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              >
                <option value="dynamic">Dynamic</option>
                <option value="static">Static</option>
              </select>
            </div>

            {/* Rules */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-text-secondary">
                Rules <span className="text-text-muted font-normal">(combined with AND)</span>
              </label>

              {rules.map((rule, idx) => {
                const fieldKey = rule.field as FieldKey;
                const operators = FIELD_OPERATORS[fieldKey] ?? [];
                const isDate = DATE_FIELDS.includes(fieldKey);

                return (
                  <div key={idx} className="flex items-start gap-2">
                    {/* Field */}
                    <select
                      value={rule.field}
                      onChange={(e) => updateRule(idx, { field: e.target.value })}
                      className="min-w-[140px] rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                    >
                      {FIELD_OPTIONS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>

                    {/* Operator */}
                    <select
                      value={rule.operator}
                      onChange={(e) => updateRule(idx, { operator: e.target.value })}
                      className="min-w-[120px] rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                    >
                      {operators.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>

                    {/* Value */}
                    <input
                      type={isDate ? "date" : "text"}
                      placeholder="Value"
                      value={rule.value}
                      onChange={(e) => updateRule(idx, { value: e.target.value })}
                      className="flex-1 rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                    />

                    {/* Remove */}
                    <button
                      onClick={() => removeRule(idx)}
                      disabled={rules.length <= 1}
                      className="rounded-lg p-2 text-text-muted hover:bg-danger/10 hover:text-danger disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-muted"
                      title="Remove rule"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}

              <button
                onClick={addRule}
                className="flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Rule
              </button>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={closeModal}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!name.trim() || isSaving}
                className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "Update" : "Create"}
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
                <th className="px-4 py-3 text-left font-medium text-text-muted">Name</th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Type</th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Match Count</th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Created</th>
                <th className="px-4 py-3 text-right font-medium text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered?.map((seg) => (
                <tr
                  key={seg.id}
                  className="border-b border-border/50 hover:bg-bg-hover transition-colors"
                >
                  {/* Name */}
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">{seg.name}</span>
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        seg.type === "dynamic"
                          ? "bg-accent/10 text-accent"
                          : "bg-bg-elevated text-text-muted"
                      }`}
                    >
                      {seg.type}
                    </span>
                  </td>

                  {/* Match Count */}
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                      <Users className="h-3 w-3" />
                      {(seg.match_count ?? 0).toLocaleString()}
                    </span>
                  </td>

                  {/* Created */}
                  <td className="px-4 py-3 text-text-muted">
                    {new Date(seg.created_at).toLocaleDateString()}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(seg)}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-foreground"
                        title="Edit segment"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Delete this segment?")) deleteSegment(seg.id);
                        }}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-danger/10 hover:text-danger"
                        title="Delete segment"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-text-muted">
                    No segments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
