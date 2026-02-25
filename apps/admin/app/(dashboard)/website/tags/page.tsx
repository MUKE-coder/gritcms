"use client";

import { useState } from "react";
import { usePostTags, useCreatePostTag, useDeletePostTag } from "@/hooks/use-website";
import { Plus, Trash2, X } from "@/lib/icons";
import { ConfirmModal } from "@/components/ui/confirm-modal";

export default function PostTagsPage() {
  const { data: tags, isLoading } = usePostTags();
  const { mutate: createTag, isPending: isCreating } = useCreatePostTag();
  const { mutate: deleteTag, isPending: isDeleting } = useDeletePostTag();

  const [name, setName] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createTag({ name: name.trim() }, { onSuccess: () => setName("") });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Post Tags</h1>
        <p className="text-text-secondary mt-1">Label and categorize your blog posts</p>
      </div>

      {/* Create form */}
      <form onSubmit={handleCreate} className="flex items-center gap-2 max-w-md">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New tag name..."
          className="flex-1 rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none"
        />
        <button type="submit" disabled={isCreating || !name.trim()} className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors">
          <Plus className="h-4 w-4" />
          Add
        </button>
      </form>

      {/* Tags grid */}
      {isLoading ? (
        <div className="text-text-muted">Loading...</div>
      ) : !tags || tags.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg-secondary p-8 text-center text-text-muted">No tags yet.</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center gap-1.5 rounded-full border border-border bg-bg-secondary pl-3 pr-1.5 py-1">
              <span className="text-sm text-foreground">{tag.name}</span>
              <span className="text-xs text-text-muted">({tag.slug})</span>
              <button
                onClick={() => setDeletingId(tag.id)}
                className="rounded-full p-0.5 text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={deletingId !== null}
        onConfirm={() => { if (deletingId) deleteTag(deletingId); setDeletingId(null); }}
        onCancel={() => setDeletingId(null)}
        title="Delete Tag"
        description="Are you sure? This tag will be removed from all posts."
        confirmLabel="Delete"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
}
