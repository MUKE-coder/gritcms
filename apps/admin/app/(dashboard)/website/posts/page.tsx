"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePosts, useDeletePost, usePostCategories } from "@/hooks/use-website";
import { Search, Plus } from "@/lib/icons";
import { ConfirmModal } from "@/components/ui/confirm-modal";

const statusColors: Record<string, string> = {
  draft: "bg-warning/10 text-warning",
  published: "bg-success/10 text-success",
  archived: "bg-text-muted/10 text-text-muted",
};

export default function PostsListPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data, isLoading } = usePosts({ page, search, status: statusFilter, category: categoryFilter });
  const { data: categories } = usePostCategories();
  const { mutate: deletePost, isPending: isDeleting } = useDeletePost();

  const posts = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Blog Posts</h1>
          <p className="text-text-secondary mt-1">Write and publish articles</p>
        </div>
        <Link
          href="/website/posts/new"
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Post
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-tertiary px-3 py-1.5 flex-1 max-w-sm">
          <Search className="h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search posts..."
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
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-border bg-bg-tertiary px-3 py-1.5 text-sm text-foreground focus:outline-none"
        >
          <option value="">All categories</option>
          {categories?.map((cat) => (
            <option key={cat.id} value={cat.slug}>{cat.name}</option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-text-muted">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            {search || statusFilter || categoryFilter ? "No posts match your filters." : "No posts yet. Write your first article."}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Author</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Categories</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Reading</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Published</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-b border-border/50 hover:bg-bg-hover/50 transition-colors">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => router.push(`/website/posts/${post.id}`)}
                      className="text-sm font-medium text-foreground hover:text-accent transition-colors text-left"
                    >
                      {post.title}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {post.author ? `${post.author.first_name} ${post.author.last_name}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[post.status] ?? ""}`}>
                      {post.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {post.categories?.map((c) => c.name).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{post.reading_time} min</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {post.published_at ? new Date(post.published_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => router.push(`/website/posts/${post.id}`)}
                        className="text-xs text-text-secondary hover:text-accent transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeletingId(post.id)}
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

      {meta && meta.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-muted">{meta.total} post{meta.total !== 1 ? "s" : ""} total</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover disabled:opacity-50 transition-colors">Previous</button>
            <span className="text-sm text-text-secondary">Page {meta.page} of {meta.pages}</span>
            <button onClick={() => setPage((p) => Math.min(meta.pages, p + 1))} disabled={page >= meta.pages} className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover disabled:opacity-50 transition-colors">Next</button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={deletingId !== null}
        onConfirm={() => { if (deletingId) deletePost(deletingId); setDeletingId(null); }}
        onCancel={() => setDeletingId(null)}
        title="Delete Post"
        description="Are you sure you want to delete this post? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
}
