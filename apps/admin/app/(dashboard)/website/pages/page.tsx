"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePages, useDeletePage } from "@/hooks/use-website";
import { Search, Plus, Trash2 } from "@/lib/icons";
import { ConfirmModal } from "@/components/ui/confirm-modal";

const statusColors: Record<string, string> = {
  draft: "bg-warning/10 text-warning",
  published: "bg-success/10 text-success",
  archived: "bg-text-muted/10 text-text-muted",
};

export default function PagesListPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data, isLoading } = usePages({ page, search, status: statusFilter });
  const { mutate: deletePage, isPending: isDeleting } = useDeletePage();

  const pages = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pages</h1>
          <p className="text-text-secondary mt-1">Manage your website pages</p>
        </div>
        <Link
          href="/website/pages/new"
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Page
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-tertiary px-3 py-1.5 flex-1 max-w-sm">
          <Search className="h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search pages..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-text-muted focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-border bg-bg-tertiary px-3 py-1.5 text-sm text-foreground focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-text-muted">Loading...</div>
        ) : pages.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            {search || statusFilter ? "No pages match your filters." : "No pages yet. Create your first page."}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Slug</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Template</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Updated</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((pg) => (
                <tr key={pg.id} className="border-b border-border/50 hover:bg-bg-hover/50 transition-colors">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => router.push(`/website/pages/${pg.id}`)}
                      className="text-sm font-medium text-foreground hover:text-accent transition-colors text-left"
                    >
                      {pg.title}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">/{pg.slug}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[pg.status] ?? ""}`}>
                      {pg.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{pg.template || "default"}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {new Date(pg.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => router.push(`/website/pages/${pg.id}`)}
                        className="text-xs text-text-secondary hover:text-accent transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeletingId(pg.id)}
                        className="text-xs text-text-secondary hover:text-danger transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-muted">
            {meta.total} page{meta.total !== 1 ? "s" : ""} total
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover disabled:opacity-50 transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-text-secondary">
              Page {meta.page} of {meta.pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
              disabled={page >= meta.pages}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmModal
        open={deletingId !== null}
        onConfirm={() => {
          if (deletingId) deletePage(deletingId);
          setDeletingId(null);
        }}
        onCancel={() => setDeletingId(null)}
        title="Delete Page"
        description="Are you sure you want to delete this page? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
}
