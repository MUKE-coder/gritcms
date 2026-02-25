"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useEmailList, useUpdateEmailList, useSubscribers, useRemoveSubscriber } from "@/hooks/use-email";
import { ChevronLeft, Save, Trash2, Loader2 } from "@/lib/icons";
import Link from "next/link";

export default function EmailListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const { data: list, isLoading } = useEmailList(id);
  const { mutate: updateList, isPending: saving } = useUpdateEmailList();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const { data: subsData } = useSubscribers({ listId: id, page, status: statusFilter || undefined });
  const { mutate: removeSub } = useRemoveSubscriber();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [doubleOptin, setDoubleOptin] = useState(false);
  const [initialized, setInitialized] = useState(false);

  if (list && !initialized) {
    setName(list.name);
    setDescription(list.description || "");
    setDoubleOptin(list.double_optin);
    setInitialized(true);
  }

  const handleSave = () => {
    updateList({ id, name, description, double_optin: doubleOptin });
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
        <Link href="/email/lists" className="rounded-lg p-1.5 hover:bg-bg-hover text-text-muted">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{list?.name || "Email List"}</h1>
          <p className="text-text-secondary mt-1">{list?.subscriber_count ?? 0} subscribers</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Settings */}
      <div className="rounded-xl border border-border bg-bg-secondary p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">List Settings</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={doubleOptin}
            onChange={(e) => setDoubleOptin(e.target.checked)}
            className="rounded border-border"
          />
          Require double opt-in confirmation
        </label>
      </div>

      {/* Subscribers */}
      <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Subscribers</h2>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-border bg-bg-elevated px-3 py-1.5 text-sm text-foreground"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="unsubscribed">Unsubscribed</option>
            <option value="bounced">Bounced</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-elevated">
              <th className="px-4 py-3 text-left font-medium text-text-muted">Contact</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Status</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Source</th>
              <th className="px-4 py-3 text-left font-medium text-text-muted">Subscribed</th>
              <th className="px-4 py-3 text-right font-medium text-text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {subsData?.data?.map((sub) => (
              <tr key={sub.id} className="border-b border-border/50 hover:bg-bg-hover transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">
                    {sub.contact?.first_name} {sub.contact?.last_name}
                  </p>
                  <p className="text-xs text-text-muted">{sub.contact?.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    sub.status === "active" ? "bg-success/10 text-success" :
                    sub.status === "unsubscribed" ? "bg-warning/10 text-warning" :
                    sub.status === "bounced" ? "bg-danger/10 text-danger" :
                    "bg-bg-elevated text-text-muted"
                  }`}>
                    {sub.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-muted">{sub.source || "—"}</td>
                <td className="px-4 py-3 text-text-muted">
                  {sub.subscribed_at ? new Date(sub.subscribed_at).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        if (confirm("Remove this subscriber?")) removeSub({ listId: id, subId: sub.id });
                      }}
                      className="rounded-lg p-1.5 text-text-muted hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {subsData?.data?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-muted">No subscribers yet.</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {subsData?.meta && subsData.meta.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-text-muted">{subsData.meta.total} total</p>
            <div className="flex gap-1">
              {Array.from({ length: subsData.meta.pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`rounded-lg px-3 py-1 text-sm ${p === page ? "bg-accent text-white" : "text-text-muted hover:bg-bg-hover"}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
