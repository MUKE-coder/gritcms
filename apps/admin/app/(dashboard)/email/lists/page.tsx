"use client";

import { useState } from "react";
import Link from "next/link";
import { useEmailLists, useDeleteEmailList, useCreateEmailList } from "@/hooks/use-email";
import { Plus, Trash2, Pencil, Search, Loader2, Share2, Link2, Copy, Check, X } from "@/lib/icons";
import { toast } from "sonner";

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

        {/* Custom source */}
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
              onClick={() => {
                if (customUrl) handleCopy(customUrl, 100);
              }}
              disabled={!customUrl}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-40 transition-colors"
            >
              {copiedIdx === 100 ? "Copied!" : "Copy"}
            </button>
          </div>
          {customUrl && (
            <p className="mt-1.5 text-xs text-text-muted truncate">{customUrl}</p>
          )}
        </div>

        <p className="text-xs text-text-muted">
          The source tag tracks where subscribers came from. You can see it in the Subscribers table.
        </p>
      </div>
    </div>
  );
}

export default function EmailListsPage() {
  const { data: lists, isLoading } = useEmailLists();
  const { mutate: deleteList } = useDeleteEmailList();
  const { mutate: createList } = useCreateEmailList();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDoubleOptin, setNewDoubleOptin] = useState(false);
  const [shareList, setShareList] = useState<{ id: number; name: string } | null>(null);

  const filtered = lists?.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    createList(
      { name: newName, description: newDesc, double_optin: newDoubleOptin },
      {
        onSuccess: () => {
          setShowCreate(false);
          setNewName("");
          setNewDesc("");
          setNewDoubleOptin(false);
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Email Lists</h1>
          <p className="text-text-secondary mt-1">Manage your subscriber lists.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New List
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Search lists..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-bg-secondary py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none"
        />
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-bg-elevated p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Create Email List</h2>
            <input
              type="text"
              placeholder="List name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
            />
            <textarea
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
            />
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={newDoubleOptin}
                onChange={(e) => setNewDoubleOptin(e.target.checked)}
                className="rounded border-border"
              />
              Require double opt-in
            </label>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share links modal */}
      {shareList && (
        <ShareLinksModal listId={shareList.id} listName={shareList.name} onClose={() => setShareList(null)} />
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
                <th className="px-4 py-3 text-left font-medium text-text-muted">Subscribers</th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Double Opt-in</th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Created</th>
                <th className="px-4 py-3 text-right font-medium text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered?.map((list) => (
                <tr key={list.id} className="border-b border-border/50 hover:bg-bg-hover transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/email/lists/${list.id}`} className="font-medium text-foreground hover:text-accent">
                      {list.name}
                    </Link>
                    {list.description && (
                      <p className="text-xs text-text-muted mt-0.5">{list.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{list.subscriber_count?.toLocaleString() ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${list.double_optin ? "bg-accent/10 text-accent" : "bg-bg-elevated text-text-muted"}`}>
                      {list.double_optin ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{new Date(list.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setShareList({ id: list.id, name: list.name })}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-accent/10 hover:text-accent"
                        title="Share subscribe link"
                      >
                        <Share2 className="h-4 w-4" />
                      </button>
                      <Link
                        href={`/email/lists/${list.id}`}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => {
                          if (confirm("Delete this list?")) deleteList(list.id);
                        }}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-text-muted">No email lists found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
