"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useEmailSequences,
  useDeleteEmailSequence,
  useCreateEmailSequence,
} from "@/hooks/use-email";
import { Plus, Trash2, Pencil, Search, Loader2, Zap } from "@/lib/icons";

export default function EmailSequencesPage() {
  const { data: sequences, isLoading } = useEmailSequences();
  const { mutate: deleteSequence } = useDeleteEmailSequence();
  const { mutate: createSequence } = useCreateEmailSequence();

  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newTrigger, setNewTrigger] = useState<"manual" | "event">("manual");
  const [newTriggerEvent, setNewTriggerEvent] = useState("");

  const filtered = sequences?.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    createSequence(
      {
        name: newName,
        description: newDesc,
        trigger: newTrigger,
        trigger_event: newTrigger === "event" ? newTriggerEvent : "",
      },
      {
        onSuccess: () => {
          setShowCreate(false);
          setNewName("");
          setNewDesc("");
          setNewTrigger("manual");
          setNewTriggerEvent("");
        },
      }
    );
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success/10 text-success";
      case "paused":
        return "bg-warning/10 text-warning";
      case "draft":
      default:
        return "bg-bg-elevated text-text-muted";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Email Sequences
          </h1>
          <p className="text-text-secondary mt-1">
            Create automated email sequences to nurture your contacts.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Sequence
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Search sequences..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-bg-secondary py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none"
        />
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-bg-elevated p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Create Sequence
            </h2>
            <input
              type="text"
              placeholder="Sequence name"
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
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Trigger
              </label>
              <select
                value={newTrigger}
                onChange={(e) =>
                  setNewTrigger(e.target.value as "manual" | "event")
                }
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              >
                <option value="manual">Manual</option>
                <option value="event">Event</option>
              </select>
            </div>
            {newTrigger === "event" && (
              <input
                type="text"
                placeholder="Trigger event name (e.g. user.signed_up)"
                value={newTriggerEvent}
                onChange={(e) => setNewTriggerEvent(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            )}
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
                <th className="px-4 py-3 text-left font-medium text-text-muted">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">
                  Trigger
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">
                  Steps
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">
                  Created
                </th>
                <th className="px-4 py-3 text-right font-medium text-text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered?.map((seq) => (
                <tr
                  key={seq.id}
                  className="border-b border-border/50 hover:bg-bg-hover transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/email/sequences/${seq.id}`}
                      className="font-medium text-foreground hover:text-accent"
                    >
                      {seq.name}
                    </Link>
                    {seq.description && (
                      <p className="text-xs text-text-muted mt-0.5">
                        {seq.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-text-secondary">
                      <Zap className="h-3.5 w-3.5" />
                      {seq.trigger}
                      {seq.trigger === "event" && seq.trigger_event && (
                        <span className="text-xs text-text-muted ml-1">
                          ({seq.trigger_event})
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(seq.status)}`}
                    >
                      {seq.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {seq.steps?.length ?? 0}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {new Date(seq.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/email/sequences/${seq.id}`}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => {
                          if (confirm("Delete this sequence?"))
                            deleteSequence(seq.id);
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
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-text-muted"
                  >
                    No sequences found.
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
