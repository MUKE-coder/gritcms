"use client";

import { useState } from "react";
import { usePostCategories, useCreatePostCategory, useUpdatePostCategory, useDeletePostCategory } from "@/hooks/use-website";
import { Plus, Pencil, Trash2 } from "@/lib/icons";
import { ConfirmModal } from "@/components/ui/confirm-modal";

export default function CategoriesPage() {
  const { data: categories, isLoading } = usePostCategories();
  const { mutate: create, isPending: isCreating } = useCreatePostCategory();
  const { mutate: update } = useUpdatePostCategory();
  const { mutate: remove, isPending: isDeleting } = useDeletePostCategory();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingId) {
      update({ id: editingId, name, description }, { onSuccess: () => resetForm() });
    } else {
      create({ name, description }, { onSuccess: () => resetForm() });
    }
  };

  const startEdit = (cat: { id: number; name: string; description: string }) => {
    setEditingId(cat.id);
    setName(cat.name);
    setDescription(cat.description || "");
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setDescription("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Categories</h1>
          <p className="text-text-secondary mt-1">Organize your blog posts into categories</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Category
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-bg-secondary p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" className="w-full max-w-sm rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" rows={2} className="w-full max-w-sm rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none resize-none" />
          </div>
          <div className="flex items-center gap-2">
            <button type="submit" disabled={isCreating || !name.trim()} className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors">
              {editingId ? "Update" : "Create"}
            </button>
            <button type="button" onClick={resetForm} className="rounded-lg border border-border px-4 py-1.5 text-sm text-text-secondary hover:bg-bg-hover transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-text-muted">Loading...</div>
        ) : !categories || categories.length === 0 ? (
          <div className="p-8 text-center text-text-muted">No categories yet.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Slug</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Description</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} className="border-b border-border/50 hover:bg-bg-hover/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{cat.name}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{cat.slug}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{cat.description || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => startEdit(cat)} className="rounded-md p-1.5 text-text-secondary hover:text-accent hover:bg-accent/10 transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeletingId(cat.id)} className="rounded-md p-1.5 text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmModal
        open={deletingId !== null}
        onConfirm={() => { if (deletingId) remove(deletingId); setDeletingId(null); }}
        onCancel={() => setDeletingId(null)}
        title="Delete Category"
        description="Are you sure? Posts in this category won't be deleted."
        confirmLabel="Delete"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
}
