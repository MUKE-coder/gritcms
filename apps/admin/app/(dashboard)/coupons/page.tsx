"use client";

import { useState, useMemo } from "react";
import {
  useCoupons,
  useCreateCoupon,
  useUpdateCoupon,
  useDeleteCoupon,
} from "@/hooks/use-commerce";
import {
  Plus,
  Trash2,
  Pencil,
  Search,
  Loader2,
  X,
  Tag,
} from "@/lib/icons";
import { useConfirm } from "@/hooks/use-confirm";
import type { Coupon } from "@repo/shared/types";

const statusBadge: Record<string, string> = {
  active: "bg-green-500/10 text-green-400",
  expired: "bg-red-500/10 text-red-400",
  disabled: "bg-zinc-500/10 text-zinc-400",
};

const EMPTY_FORM = {
  code: "",
  type: "percentage" as "percentage" | "fixed",
  amount: "",
  min_order_amount: "",
  max_uses: "0",
  valid_from: "",
  valid_until: "",
  status: "active" as "active" | "expired" | "disabled",
};

export default function CouponsPage() {
  const confirm = useConfirm();
  const { data: coupons, isLoading } = useCoupons();
  const { mutate: createCoupon, isPending: isCreating } = useCreateCoupon();
  const { mutate: updateCoupon, isPending: isUpdating } = useUpdateCoupon();
  const { mutate: deleteCoupon } = useDeleteCoupon();

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form state
  const [form, setForm] = useState(EMPTY_FORM);

  // Filtering
  const filtered = useMemo(() => {
    if (!coupons) return [];
    if (!search) return coupons;
    const q = search.toLowerCase();
    return coupons.filter((c) => c.code.toLowerCase().includes(q));
  }, [coupons, search]);

  // ---- Modal helpers ----
  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(coupon: Coupon) {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      type: coupon.type,
      amount: String(coupon.amount),
      min_order_amount: String(coupon.min_order_amount),
      max_uses: String(coupon.max_uses),
      valid_from: coupon.valid_from
        ? coupon.valid_from.slice(0, 10)
        : "",
      valid_until: coupon.valid_until
        ? coupon.valid_until.slice(0, 10)
        : "",
      status: coupon.status,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
  }

  function updateField<K extends keyof typeof EMPTY_FORM>(
    key: K,
    value: (typeof EMPTY_FORM)[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // ---- Submit ----
  function handleSubmit() {
    const body: Partial<Coupon> = {
      code: form.code.toUpperCase().trim(),
      type: form.type,
      amount: Number(form.amount) || 0,
      min_order_amount: Number(form.min_order_amount) || 0,
      max_uses: Number(form.max_uses) || 0,
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
      status: form.status,
    };

    if (editingId) {
      updateCoupon(
        { id: editingId, ...body },
        { onSuccess: closeModal }
      );
    } else {
      createCoupon(body, { onSuccess: closeModal });
    }
  }

  const isSaving = isCreating || isUpdating;

  function formatDiscount(coupon: Coupon) {
    if (coupon.type === "percentage") return `${coupon.amount}%`;
    return `$${coupon.amount.toFixed(2)}`;
  }

  function formatUsage(coupon: Coupon) {
    if (coupon.max_uses === 0)
      return `${coupon.used_count} / unlimited`;
    return `${coupon.used_count} / ${coupon.max_uses}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Coupons</h1>
          <p className="text-text-secondary mt-1">
            Create and manage discount coupons.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Coupon
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Search coupon codes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-bg-secondary py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl border border-border bg-bg-elevated p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {editingId ? "Edit Coupon" : "Create Coupon"}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-lg p-1 text-text-muted hover:bg-bg-hover hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Code */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-secondary">
                Code
              </label>
              <input
                type="text"
                placeholder="e.g. SAVE20"
                value={form.code}
                onChange={(e) =>
                  updateField("code", e.target.value.toUpperCase())
                }
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground font-mono uppercase focus:border-accent focus:outline-none"
              />
            </div>

            {/* Type + Amount */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-text-secondary">
                  Type
                </label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    updateField(
                      "type",
                      e.target.value as "percentage" | "fixed"
                    )
                  }
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-text-secondary">
                  {form.type === "percentage" ? "Discount (%)" : "Discount ($)"}
                </label>
                <input
                  type="number"
                  step={form.type === "percentage" ? "1" : "0.01"}
                  min="0"
                  placeholder={form.type === "percentage" ? "20" : "10.00"}
                  value={form.amount}
                  onChange={(e) => updateField("amount", e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            {/* Min Order + Max Uses */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-text-secondary">
                  Min Order Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.min_order_amount}
                  onChange={(e) =>
                    updateField("min_order_amount", e.target.value)
                  }
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-text-secondary">
                  Max Uses
                  <span className="text-text-muted font-normal ml-1">
                    (0 = unlimited)
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.max_uses}
                  onChange={(e) => updateField("max_uses", e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            {/* Valid From + Until */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-text-secondary">
                  Valid From
                </label>
                <input
                  type="date"
                  value={form.valid_from}
                  onChange={(e) => updateField("valid_from", e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-text-secondary">
                  Valid Until
                </label>
                <input
                  type="date"
                  value={form.valid_until}
                  onChange={(e) => updateField("valid_until", e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-text-secondary">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  updateField(
                    "status",
                    e.target.value as "active" | "expired" | "disabled"
                  )
                }
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              >
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="disabled">Disabled</option>
              </select>
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
                disabled={!form.code.trim() || !form.amount || isSaving}
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
                <th className="px-4 py-3 text-left font-medium text-text-muted">
                  Code
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">
                  Type
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">
                  Discount
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">
                  Min Order
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">
                  Usage
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">
                  Valid Until
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">
                  Status
                </th>
                <th className="px-4 py-3 text-right font-medium text-text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((coupon) => (
                <tr
                  key={coupon.id}
                  className="border-b border-border/50 hover:bg-bg-hover transition-colors"
                >
                  {/* Code */}
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-foreground bg-bg-elevated rounded-md px-2 py-1">
                      <Tag className="h-3 w-3 text-text-muted" />
                      {coupon.code}
                    </span>
                  </td>
                  {/* Type */}
                  <td className="px-4 py-3 text-text-secondary capitalize">
                    {coupon.type}
                  </td>
                  {/* Discount */}
                  <td className="px-4 py-3 text-foreground font-medium">
                    {formatDiscount(coupon)}
                  </td>
                  {/* Min Order */}
                  <td className="px-4 py-3 text-text-secondary">
                    {coupon.min_order_amount > 0
                      ? `$${coupon.min_order_amount.toFixed(2)}`
                      : "---"}
                  </td>
                  {/* Usage */}
                  <td className="px-4 py-3 text-text-secondary">
                    {formatUsage(coupon)}
                  </td>
                  {/* Valid Until */}
                  <td className="px-4 py-3 text-text-muted">
                    {coupon.valid_until
                      ? new Date(coupon.valid_until).toLocaleDateString()
                      : "No expiry"}
                  </td>
                  {/* Status */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        statusBadge[coupon.status] ??
                        "bg-bg-elevated text-text-muted"
                      }`}
                    >
                      {coupon.status}
                    </span>
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(coupon)}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-foreground"
                        title="Edit coupon"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={async () => {
                          const ok = await confirm({
                            title: "Delete Coupon",
                            description: "Delete this coupon? This cannot be undone.",
                            confirmLabel: "Delete",
                            variant: "danger",
                          });
                          if (ok) deleteCoupon(coupon.id);
                        }}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-danger/10 hover:text-danger"
                        title="Delete coupon"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-text-muted"
                  >
                    No coupons found.
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
