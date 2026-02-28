"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useContacts,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
  useTags,
  useCreateTag,
  useDeleteTag,
  useImportContacts,
  useExportContacts,
  useContactSources,
  useSendEmailToContacts,
} from "@/hooks/use-contacts";
import { useConfirm } from "@/hooks/use-confirm";
import { useEmailTemplates } from "@/hooks/use-email";
import {
  Plus,
  Trash2,
  Pencil,
  Search,
  Loader2,
  X,
  Users,
  Tag,
  Eye,
  Upload,
  Download,
  ChevronDown,
  Mail,
} from "@/lib/icons";
import { Dropzone, type UploadedFile } from "@/components/ui/dropzone";
import { ImportModal } from "@/components/import-modal";
import type { Contact, Tag as TagType, EmailTemplate, ImportResult } from "@repo/shared/types";

const sourceBadge: Record<string, string> = {
  organic: "bg-green-500/10 text-green-400",
  funnel: "bg-accent/10 text-accent",
  referral: "bg-purple-500/10 text-purple-400",
  import: "bg-yellow-500/10 text-yellow-400",
  manual: "bg-zinc-500/10 text-zinc-400",
  api: "bg-blue-500/10 text-blue-400",
};

const TAG_COLORS = [
  "#6c5ce7", "#3b82f6", "#14b8a6", "#22c55e", "#f97316",
  "#ef4444", "#ec4899", "#f59e0b", "#06b6d4", "#64748b",
];

function timeAgo(dateStr: string | null) {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ContactsPage() {
  // List state
  const [page, setPage] = useState(1);
  const [sourceFilter, setSourceFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Modal state
  const [showCreate, setShowCreate] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showTagManager, setShowTagManager] = useState(false);

  // Form state
  const [formEmail, setFormEmail] = useState("");
  const [formFirstName, setFormFirstName] = useState("");
  const [formLastName, setFormLastName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAvatar, setFormAvatar] = useState("");
  const [formSource, setFormSource] = useState("manual");
  const [formTagIds, setFormTagIds] = useState<number[]>([]);

  // Tag form state
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);

  // Bulk state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Import/Export state
  const [showImport, setShowImport] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Send email state
  const [showSendEmail, setShowSendEmail] = useState(false);
  const [sendTemplateId, setSendTemplateId] = useState<number>(0);
  const [sendSubject, setSendSubject] = useState("");

  // Data
  const { data: sourcesData } = useContactSources();
  const sources = sourcesData ?? [];
  const { data, isLoading } = useContacts({
    page,
    pageSize: 20,
    search: search || undefined,
    source: sourceFilter || undefined,
    tag: tagFilter || undefined,
  });
  const { data: allTags } = useTags();
  const { mutate: createContact } = useCreateContact();
  const { mutate: updateContact } = useUpdateContact();
  const { mutate: deleteContact } = useDeleteContact();
  const { mutate: createTag } = useCreateTag();
  const { mutate: deleteTag } = useDeleteTag();
  const { mutate: importContacts, isPending: importing } = useImportContacts();
  const { mutate: exportContacts } = useExportContacts();
  const { data: emailTemplates } = useEmailTemplates();
  const { mutate: sendEmail, isPending: sendingEmail } = useSendEmailToContacts();
  const confirm = useConfirm();

  const contacts = data?.data ?? [];
  const meta = data?.meta;

  // Handlers
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const resetForm = () => {
    setFormEmail("");
    setFormFirstName("");
    setFormLastName("");
    setFormPhone("");
    setFormAvatar("");
    setFormSource("manual");
    setFormTagIds([]);
  };

  const openCreate = () => {
    resetForm();
    setEditingContact(null);
    setShowCreate(true);
  };

  const openEdit = (contact: Contact) => {
    setFormEmail(contact.email);
    setFormFirstName(contact.first_name);
    setFormLastName(contact.last_name);
    setFormPhone(contact.phone || "");
    setFormAvatar(contact.avatar_url || "");
    setFormSource(contact.source || "manual");
    setFormTagIds(contact.tags?.map((t) => t.id) ?? []);
    setEditingContact(contact);
    setShowCreate(true);
  };

  const handleSubmit = () => {
    const body = {
      email: formEmail,
      first_name: formFirstName,
      last_name: formLastName,
      phone: formPhone,
      avatar_url: formAvatar,
      source: formSource,
      tag_ids: formTagIds,
    };

    if (editingContact) {
      updateContact(
        { id: editingContact.id, ...body },
        { onSuccess: () => { setShowCreate(false); resetForm(); setEditingContact(null); } }
      );
    } else {
      createContact(body, {
        onSuccess: () => { setShowCreate(false); resetForm(); },
      });
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirm({ title: "Delete Contact", description: "Delete this contact? This cannot be undone.", confirmLabel: "Delete", variant: "danger" });
    if (ok) {
      deleteContact(id);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ok = await confirm({ title: "Delete Contacts", description: `Delete ${selectedIds.size} contact(s)? This cannot be undone.`, confirmLabel: "Delete All", variant: "danger" });
    if (!ok) return;
    selectedIds.forEach((id) => deleteContact(id));
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map((c) => c.id)));
    }
  };

  const toggleFormTag = (tagId: number) => {
    setFormTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  const handleCreateTag = () => {
    if (!newTagName.trim()) return;
    createTag(
      { name: newTagName.trim(), color: newTagColor },
      { onSuccess: () => { setNewTagName(""); setNewTagColor(TAG_COLORS[0]); } }
    );
  };

  const handleImportFile = (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("source", "import");
    importContacts(fd, { onSuccess: (r) => setImportResult(r) });
  };

  const handleImportEmails = (emails: string) => {
    const fd = new FormData();
    fd.append("emails", emails);
    fd.append("source", "import");
    importContacts(fd, { onSuccess: (r) => setImportResult(r) });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contacts</h1>
          <p className="text-text-secondary mt-1">
            Manage your contacts, tags, and relationships.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTagManager(true)}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover transition-colors"
          >
            <Tag className="h-4 w-4" />
            Tags
          </button>
          <button
            onClick={() => { setImportResult(null); setShowImport(true); }}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover transition-colors"
          >
            <Upload className="h-4 w-4" />
            Import
          </button>
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover transition-colors"
            >
              <Download className="h-4 w-4" />
              Export
              <ChevronDown className="h-3 w-3" />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-lg border border-border bg-bg-elevated shadow-xl py-1">
                <button
                  onClick={() => { exportContacts("csv"); setShowExportMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-bg-hover transition-colors"
                >
                  Export as CSV
                </button>
                <button
                  onClick={() => { exportContacts("xlsx"); setShowExportMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-bg-hover transition-colors"
                >
                  Export as Excel
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowSendEmail(true)}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover transition-colors"
          >
            <Mail className="h-4 w-4" />
            Send Email
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Contact
          </button>
        </div>
      </div>

      {/* Search + Source Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg-secondary py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-bg-secondary p-1 overflow-x-auto">
          <button
            onClick={() => { setSourceFilter(""); setPage(1); }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
              sourceFilter === ""
                ? "bg-accent text-white"
                : "text-text-muted hover:text-foreground hover:bg-bg-hover"
            }`}
          >
            All
          </button>
          {sources.map((src) => (
            <button
              key={src}
              onClick={() => { setSourceFilter(src); setPage(1); }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap capitalize ${
                sourceFilter === src
                  ? "bg-accent text-white"
                  : "text-text-muted hover:text-foreground hover:bg-bg-hover"
              }`}
            >
              {src}
            </button>
          ))}
        </div>
      </div>

      {/* Tag filter */}
      {allTags && allTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-text-muted font-medium">Filter by tag:</span>
          <button
            onClick={() => { setTagFilter(""); setPage(1); }}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
              !tagFilter ? "bg-accent text-white" : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
            }`}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => { setTagFilter(tag.name); setPage(1); }}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                tagFilter === tag.name ? "text-white" : "text-text-secondary hover:opacity-80"
              }`}
              style={{
                backgroundColor: tagFilter === tag.name ? tag.color : `${tag.color}20`,
                color: tagFilter === tag.name ? "#fff" : tag.color,
              }}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-bg-secondary px-4 py-2.5">
          <span className="text-sm text-text-secondary">{selectedIds.size} selected</span>
          <button
            onClick={() => setShowSendEmail(true)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/10 transition-colors"
          >
            <Mail className="h-3.5 w-3.5" />
            Send Email
          </button>
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-sm text-text-muted hover:text-foreground"
          >
            Clear
          </button>
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
                <th className="px-4 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={contacts.length > 0 && selectedIds.size === contacts.length}
                    onChange={toggleSelectAll}
                    className="h-3.5 w-3.5 rounded border-border accent-accent"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Contact</th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Phone</th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Source</th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Tags</th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Last Active</th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Created</th>
                <th className="px-4 py-3 text-right font-medium text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id} className="border-b border-border/50 hover:bg-bg-hover transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(contact.id)}
                      onChange={() => toggleSelect(contact.id)}
                      className="h-3.5 w-3.5 rounded border-border accent-accent"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {contact.avatar_url ? (
                        <img
                          src={contact.avatar_url}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent text-xs font-bold flex-shrink-0">
                          {(contact.first_name?.[0] || contact.email[0] || "?").toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <Link
                          href={`/contacts/${contact.id}`}
                          className="font-medium text-foreground hover:text-accent block truncate"
                        >
                          {contact.first_name || contact.last_name
                            ? `${contact.first_name} ${contact.last_name}`.trim()
                            : contact.email}
                        </Link>
                        <p className="text-xs text-text-muted truncate">{contact.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {contact.phone || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        sourceBadge[contact.source] ?? "bg-bg-elevated text-text-muted"
                      }`}
                    >
                      {contact.source || "unknown"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {contact.tags?.slice(0, 3).map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                        >
                          {tag.name}
                        </span>
                      ))}
                      {(contact.tags?.length ?? 0) > 3 && (
                        <span className="text-[10px] text-text-muted">
                          +{(contact.tags?.length ?? 0) - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-muted text-xs">
                    {timeAgo(contact.last_activity_at)}
                  </td>
                  <td className="px-4 py-3 text-text-muted text-xs">
                    {new Date(contact.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/contacts/${contact.id}`}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-foreground"
                        title="View profile"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => openEdit(contact)}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-foreground"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(contact.id)}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-danger/10 hover:text-danger"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {contacts.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                        <Users className="h-7 w-7 text-accent" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">No contacts found</p>
                        <p className="text-sm text-text-muted mt-1">
                          {search || sourceFilter
                            ? "Try adjusting your filters."
                            : "Add your first contact to get started."}
                        </p>
                      </div>
                      {!search && !sourceFilter && (
                        <button
                          onClick={openCreate}
                          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
                        >
                          <Plus className="h-4 w-4" />
                          Add Contact
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {meta && meta.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-text-muted">
                {meta.total} contact{meta.total !== 1 ? "s" : ""}
              </p>
              <div className="flex gap-1">
                {Array.from({ length: meta.pages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`rounded-lg px-3 py-1 text-sm ${
                      p === page
                        ? "bg-accent text-white"
                        : "text-text-muted hover:bg-bg-hover"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* CREATE / EDIT CONTACT MODAL                                       */}
      {/* ================================================================= */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl border border-border bg-bg-elevated p-6 space-y-5 mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {editingContact ? "Edit Contact" : "Add Contact"}
              </h2>
              <button
                onClick={() => { setShowCreate(false); setEditingContact(null); resetForm(); }}
                className="rounded-lg p-1 text-text-muted hover:bg-bg-hover hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Avatar */}
            <div className="flex justify-center">
              <Dropzone
                variant="avatar"
                maxFiles={1}
                maxSize={2 * 1024 * 1024}
                accept={{ "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp"] }}
                value={formAvatar ? [{ url: formAvatar, name: "avatar", size: 0, type: "image/jpeg" } as UploadedFile] : []}
                onFilesChange={(files) => setFormAvatar(files[0]?.url || "")}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Email *</label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="contact@example.com"
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </div>

            {/* Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">First Name</label>
                <input
                  type="text"
                  value={formFirstName}
                  onChange={(e) => setFormFirstName(e.target.value)}
                  placeholder="John"
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Last Name</label>
                <input
                  type="text"
                  value={formLastName}
                  onChange={(e) => setFormLastName(e.target.value)}
                  placeholder="Doe"
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Phone</label>
              <input
                type="tel"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </div>

            {/* Source */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Source</label>
              <select
                value={formSource}
                onChange={(e) => setFormSource(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              >
                <option value="organic">Organic</option>
                <option value="funnel">Funnel</option>
                <option value="referral">Referral</option>
                <option value="import">Import</option>
                <option value="manual">Manual</option>
                <option value="api">API</option>
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {allTags?.map((tag) => {
                  const selected = formTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleFormTag(tag.id)}
                      className="rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors"
                      style={{
                        backgroundColor: selected ? tag.color : `${tag.color}20`,
                        color: selected ? "#fff" : tag.color,
                      }}
                    >
                      {tag.name}
                    </button>
                  );
                })}
                {(!allTags || allTags.length === 0) && (
                  <p className="text-xs text-text-muted">No tags yet. Create some in Tag Manager.</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setShowCreate(false); setEditingContact(null); resetForm(); }}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formEmail.trim()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
              >
                {editingContact ? "Update Contact" : "Add Contact"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAG MANAGER MODAL                                                 */}
      {/* ================================================================= */}
      {showTagManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-bg-elevated p-6 space-y-5 mx-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Manage Tags</h2>
              <button
                onClick={() => setShowTagManager(false)}
                className="rounded-lg p-1 text-text-muted hover:bg-bg-hover hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Create tag */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-text-secondary mb-1">New Tag</label>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Tag name"
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
                />
              </div>
              <div className="flex items-center gap-1.5 pb-0.5">
                {TAG_COLORS.slice(0, 6).map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewTagColor(color)}
                    className={`h-7 w-7 rounded-full border-2 transition-all ${
                      newTagColor === color ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <button
                onClick={handleCreateTag}
                disabled={!newTagName.trim()}
                className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
              >
                Add
              </button>
            </div>

            {/* Tag list */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {allTags?.map((tag) => (
                <div key={tag.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="h-4 w-4 rounded-full" style={{ backgroundColor: tag.color }} />
                    <span className="text-sm font-medium text-foreground">{tag.name}</span>
                  </div>
                  <button
                    onClick={async () => {
                      const ok = await confirm({ title: "Delete Tag", description: `Delete tag "${tag.name}"? It will be removed from all contacts.`, confirmLabel: "Delete", variant: "danger" });
                      if (ok) deleteTag(tag.id);
                    }}
                    className="rounded-lg p-1 text-text-muted hover:bg-danger/10 hover:text-danger transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {(!allTags || allTags.length === 0) && (
                <p className="text-sm text-text-muted text-center py-4">No tags yet. Create your first tag above.</p>
              )}
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
        title="Import Contacts"
      />

      {/* ================================================================= */}
      {/* SEND EMAIL MODAL                                                  */}
      {/* ================================================================= */}
      {showSendEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl border border-border bg-bg-elevated p-6 space-y-5 mx-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Send Email
              </h2>
              <button
                onClick={() => { setShowSendEmail(false); setSendTemplateId(0); setSendSubject(""); }}
                className="rounded-lg p-1 text-text-muted hover:bg-bg-hover hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm text-text-secondary">
              {selectedIds.size > 0
                ? `Send to ${selectedIds.size} selected contact(s)`
                : sourceFilter
                  ? `Send to all "${sourceFilter}" contacts`
                  : "Send to all contacts"}
            </p>

            {/* Template select */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Email Template *
              </label>
              <select
                value={sendTemplateId}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setSendTemplateId(id);
                  const t = emailTemplates?.find((t) => t.id === id);
                  if (t?.subject && !sendSubject) setSendSubject(t.subject);
                }}
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              >
                <option value={0}>Select a template...</option>
                {emailTemplates?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Subject *
              </label>
              <input
                type="text"
                value={sendSubject}
                onChange={(e) => setSendSubject(e.target.value)}
                placeholder="Email subject line"
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setShowSendEmail(false); setSendTemplateId(0); setSendSubject(""); }}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  sendEmail(
                    {
                      contact_ids: selectedIds.size > 0 ? Array.from(selectedIds) : undefined,
                      template_id: sendTemplateId,
                      subject: sendSubject,
                      source: selectedIds.size === 0 ? sourceFilter || undefined : undefined,
                      tag: selectedIds.size === 0 ? tagFilter || undefined : undefined,
                      send_all: selectedIds.size === 0 && !sourceFilter && !tagFilter,
                    },
                    {
                      onSuccess: () => {
                        setShowSendEmail(false);
                        setSendTemplateId(0);
                        setSendSubject("");
                        setSelectedIds(new Set());
                      },
                    }
                  );
                }}
                disabled={!sendTemplateId || !sendSubject.trim() || sendingEmail}
                className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
              >
                {sendingEmail ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
