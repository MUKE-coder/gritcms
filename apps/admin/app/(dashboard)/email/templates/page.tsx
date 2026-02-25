"use client";

import { useState } from "react";
import Link from "next/link";
import { useEmailTemplates, useDeleteEmailTemplate, useCreateEmailTemplate } from "@/hooks/use-email";
import { Plus, Trash2, Pencil, Search, Loader2 } from "@/lib/icons";

const TYPE_BADGES: Record<string, string> = {
  campaign: "bg-accent/10 text-accent",
  sequence: "bg-warning/10 text-warning",
  transactional: "bg-success/10 text-success",
};

export default function EmailTemplatesPage() {
  const { data: templates, isLoading } = useEmailTemplates();
  const { mutate: deleteTemplate } = useDeleteEmailTemplate();
  const { mutate: createTemplate } = useCreateEmailTemplate();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newType, setNewType] = useState<"campaign" | "sequence" | "transactional">("campaign");

  const filtered = templates?.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    createTemplate(
      { name: newName, subject: newSubject, type: newType },
      {
        onSuccess: () => {
          setShowCreate(false);
          setNewName("");
          setNewSubject("");
          setNewType("campaign");
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Email Templates</h1>
          <p className="text-text-secondary mt-1">Create and manage your email templates.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Template
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-bg-secondary py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none"
        />
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-bg-elevated p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Create Template</h2>
            <input
              type="text"
              placeholder="Template name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
            />
            <input
              type="text"
              placeholder="Subject line"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
            />
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as "campaign" | "sequence" | "transactional")}
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              >
                <option value="campaign">Campaign</option>
                <option value="sequence">Sequence</option>
                <option value="transactional">Transactional</option>
              </select>
            </div>
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
                <th className="px-4 py-3 text-left font-medium text-text-muted">Subject</th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Updated</th>
                <th className="px-4 py-3 text-right font-medium text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered?.map((template) => (
                <tr key={template.id} className="border-b border-border/50 hover:bg-bg-hover transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/email/templates/${template.id}`} className="font-medium text-foreground hover:text-accent">
                      {template.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${TYPE_BADGES[template.type] || "bg-bg-elevated text-text-muted"}`}>
                      {template.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary truncate max-w-xs">{template.subject}</td>
                  <td className="px-4 py-3 text-text-muted">{new Date(template.updated_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/email/templates/${template.id}`}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => {
                          if (confirm("Delete this template?")) deleteTemplate(template.id);
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
                  <td colSpan={5} className="px-4 py-8 text-center text-text-muted">No email templates found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
