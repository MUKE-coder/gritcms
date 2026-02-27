"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useEmailList, useUpdateEmailList, useSubscribers, useRemoveSubscriber, useAddSubscriber, useImportSubscribers, useExportSubscribers } from "@/hooks/use-email";
import { ChevronLeft, Save, Trash2, Loader2, Share2, Copy, Check, X, Upload, Download, ChevronDown, Plus } from "@/lib/icons";
import { toast } from "sonner";
import { ImportModal } from "@/components/import-modal";
import type { ImportResult } from "@repo/shared/types";
import Link from "next/link";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || (typeof window !== "undefined" ? window.location.origin.replace("admin.", "") : "");

const SOURCES = [
  { label: "General", value: "" },
  { label: "Instagram", value: "instagram" },
  { label: "Twitter / X", value: "twitter" },
  { label: "Facebook", value: "facebook" },
  { label: "YouTube", value: "youtube" },
  { label: "LinkedIn", value: "linkedin" },
  { label: "TikTok", value: "tiktok" },
];

function buildSubscribeUrl(listId: number, source: string) {
  const base = `${WEB_URL}/subscribe?list=${listId}`;
  return source ? `${base}&source=${source}` : base;
}

function ShareLinksModal({ listId, listName, onClose }: { listId: number; listName: string; onClose: () => void }) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [customSource, setCustomSource] = useState("");

  const handleCopy = (url: string, idx: number) => {
    navigator.clipboard.writeText(url);
    setCopiedIdx(idx);
    toast.success("Link copied!");
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const customUrl = customSource.trim()
    ? buildSubscribeUrl(listId, customSource.trim().toLowerCase().replace(/\s+/g, "-"))
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border border-border bg-bg-elevated p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Share Subscribe Link</h2>
            <p className="text-sm text-text-muted mt-0.5">{listName}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2">
          {SOURCES.map((s, idx) => {
            const url = buildSubscribeUrl(listId, s.value);
            return (
              <div key={s.value} className="flex items-center gap-2 rounded-lg border border-border bg-bg-secondary p-2.5">
                <span className="shrink-0 w-24 text-xs font-medium text-text-secondary">{s.label}</span>
                <input
                  readOnly
                  value={url}
                  className="flex-1 bg-transparent text-xs text-text-muted truncate outline-none"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  onClick={() => handleCopy(url, idx)}
                  className="shrink-0 rounded-md p-1.5 text-text-muted hover:bg-bg-hover hover:text-foreground transition-colors"
                  title="Copy link"
                >
                  {copiedIdx === idx ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            );
          })}
        </div>

        <div className="border-t border-border pt-4">
          <label className="block text-xs font-medium text-text-secondary mb-1.5">Custom source tag</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. podcast, webinar, flyer"
              value={customSource}
              onChange={(e) => setCustomSource(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
            <button
              onClick={() => { if (customUrl) handleCopy(customUrl, 100); }}
              disabled={!customUrl}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-40 transition-colors"
            >
              {copiedIdx === 100 ? "Copied!" : "Copy"}
            </button>
          </div>
          {customUrl && <p className="mt-1.5 text-xs text-text-muted truncate">{customUrl}</p>}
        </div>

        <p className="text-xs text-text-muted">
          The source tag tracks where subscribers came from. You can see it in the Subscribers table.
        </p>
      </div>
    </div>
  );
}

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
  const { mutate: addSubscriber, isPending: adding } = useAddSubscriber();
  const { mutate: importSubs, isPending: importing } = useImportSubscribers();
  const { mutate: exportSubs } = useExportSubscribers();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [doubleOptin, setDoubleOptin] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showAddSub, setShowAddSub] = useState(false);
  const [subEmail, setSubEmail] = useState("");
  const [subFirstName, setSubFirstName] = useState("");
  const [subLastName, setSubLastName] = useState("");

  if (list && !initialized) {
    setName(list.name);
    setDescription(list.description || "");
    setDoubleOptin(list.double_optin);
    setInitialized(true);
  }

  const handleSave = () => {
    updateList({ id, name, description, double_optin: doubleOptin });
  };

  const handleAddSubscriber = () => {
    if (!subEmail.trim()) return;
    addSubscriber(
      { listId: id, email: subEmail.trim(), firstName: subFirstName.trim(), lastName: subLastName.trim() },
      { onSuccess: () => { setShowAddSub(false); setSubEmail(""); setSubFirstName(""); setSubLastName(""); } }
    );
  };

  const handleImportFile = (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    importSubs({ listId: id, formData: fd }, { onSuccess: (r) => setImportResult(r) });
  };

  const handleImportEmails = (emails: string) => {
    const fd = new FormData();
    fd.append("emails", emails);
    importSubs({ listId: id, formData: fd }, { onSuccess: (r) => setImportResult(r) });
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
          onClick={() => setShowShare(true)}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover transition-colors"
        >
          <Share2 className="h-4 w-4" />
          Share
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {showShare && (
        <ShareLinksModal listId={id} listName={list?.name || "Email List"} onClose={() => setShowShare(false)} />
      )}

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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddSub(true)}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
            <button
              onClick={() => { setImportResult(null); setShowImport(true); }}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-bg-hover transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              Import
            </button>
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-bg-hover transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Export
                <ChevronDown className="h-3 w-3" />
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-lg border border-border bg-bg-elevated shadow-xl py-1">
                  <button
                    onClick={() => { exportSubs({ listId: id, format: "csv" }); setShowExportMenu(false); }}
                    className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-bg-hover transition-colors"
                  >
                    Export as CSV
                  </button>
                  <button
                    onClick={() => { exportSubs({ listId: id, format: "xlsx" }); setShowExportMenu(false); }}
                    className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-bg-hover transition-colors"
                  >
                    Export as Excel
                  </button>
                </div>
              )}
            </div>
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

      {/* Add Subscriber Modal */}
      {showAddSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAddSub(false)}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-bg-elevated p-6 space-y-4 mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Add Subscriber</h2>
              <button onClick={() => setShowAddSub(false)} className="rounded-lg p-1 text-text-muted hover:bg-bg-hover">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Email *</label>
              <input
                type="email"
                value={subEmail}
                onChange={(e) => setSubEmail(e.target.value)}
                placeholder="subscriber@example.com"
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                onKeyDown={(e) => e.key === "Enter" && handleAddSubscriber()}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">First Name</label>
                <input
                  type="text"
                  value={subFirstName}
                  onChange={(e) => setSubFirstName(e.target.value)}
                  placeholder="John"
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Last Name</label>
                <input
                  type="text"
                  value={subLastName}
                  onChange={(e) => setSubLastName(e.target.value)}
                  placeholder="Doe"
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>
            </div>
            <p className="text-xs text-text-muted">
              If a contact with this email exists, they will be subscribed to this list. Otherwise a new contact will be created.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowAddSub(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSubscriber}
                disabled={!subEmail.trim() || adding}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
              >
                {adding ? "Adding..." : "Add Subscriber"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImportFile={handleImportFile}
        onImportEmails={handleImportEmails}
        isPending={importing}
        result={importResult}
        title="Import Subscribers"
      />
    </div>
  );
}
