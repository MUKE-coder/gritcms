"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  MessageCircle,
  Plus,
  Trash2,
  Pin,
  Lock,
  Unlock,
  Loader2,
  X,
  Heart,
  Filter,
  MessageSquare,
} from "@/lib/icons";
import {
  useSpace,
  useSpaceMembers,
  useThreads,
  useAddMember,
  useRemoveMember,
  useCreateThread,
  useDeleteThread,
  usePinThread,
  useCloseThread,
} from "@/hooks/use-community";
import { useConfirm } from "@/hooks/use-confirm";
import type { Space, CommunityMember, Thread } from "@repo/shared/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = "threads" | "members";
type ThreadSort = "recent" | "popular" | "newest";
type ThreadTypeFilter = "" | "discussion" | "question" | "announcement";

interface NewThreadForm {
  title: string;
  author_id: number;
  type: "discussion" | "question" | "announcement";
  content: string;
}

interface AddMemberForm {
  contact_id: number;
  role: "admin" | "moderator" | "member";
}

const emptyThreadForm: NewThreadForm = {
  title: "",
  author_id: 0,
  type: "discussion",
  content: "",
};

const emptyMemberForm: AddMemberForm = {
  contact_id: 0,
  role: "member",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function threadTypeBadge(type: Thread["type"]) {
  const map: Record<string, string> = {
    discussion: "bg-accent/10 text-accent",
    question: "bg-warning/10 text-warning",
    announcement: "bg-danger/10 text-danger",
  };
  return map[type] ?? "bg-bg-elevated text-text-muted";
}

function threadStatusBadge(status: Thread["status"]) {
  const map: Record<string, string> = {
    open: "bg-success/10 text-success",
    closed: "bg-bg-elevated text-text-muted",
    pinned: "bg-accent/10 text-accent",
  };
  return map[status] ?? "bg-bg-elevated text-text-muted";
}

function roleBadge(role: CommunityMember["role"]) {
  const map: Record<string, string> = {
    admin: "bg-danger/10 text-danger",
    moderator: "bg-warning/10 text-warning",
    member: "bg-bg-elevated text-text-muted",
  };
  return map[role] ?? "bg-bg-elevated text-text-muted";
}

function spaceTypeBadge(type: string) {
  const map: Record<string, string> = {
    forum: "bg-accent/10 text-accent",
    group: "bg-success/10 text-success",
    course: "bg-warning/10 text-warning",
  };
  return map[type] ?? "bg-bg-elevated text-text-muted";
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function initials(firstName?: string, lastName?: string): string {
  const f = (firstName ?? "")[0] ?? "";
  const l = (lastName ?? "")[0] ?? "";
  return (f + l).toUpperCase() || "?";
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function CommunitySpaceDetailPage() {
  const confirm = useConfirm();
  const params = useParams();
  const spaceId = Number(params.id);

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>("threads");

  // Thread state
  const [threadPage, setThreadPage] = useState(1);
  const [threadSort, setThreadSort] = useState<ThreadSort>("recent");
  const [threadTypeFilter, setThreadTypeFilter] = useState<ThreadTypeFilter>("");
  const [showCreateThread, setShowCreateThread] = useState(false);
  const [threadForm, setThreadForm] = useState<NewThreadForm>(emptyThreadForm);
  const [deletingThreadId, setDeletingThreadId] = useState<number | null>(null);

  // Member state
  const [memberPage, setMemberPage] = useState(1);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberForm, setMemberForm] = useState<AddMemberForm>(emptyMemberForm);

  // Data fetching
  const { data: space, isLoading: spaceLoading } = useSpace(spaceId);
  const { data: membersResult, isLoading: membersLoading } = useSpaceMembers(spaceId, memberPage);
  const { data: threadsResult } = useThreads({
    spaceId,
    page: threadPage,
    sort: threadSort,
    type: threadTypeFilter || undefined,
  });

  // Mutations
  const { mutate: addMember, isPending: addingMember } = useAddMember();
  const { mutate: removeMember } = useRemoveMember();
  const { mutate: createThread, isPending: creatingThread } = useCreateThread();
  const { mutate: deleteThread } = useDeleteThread();
  const { mutate: pinThread } = usePinThread();
  const { mutate: closeThread } = useCloseThread();

  // Data
  const threads = threadsResult?.data ?? [];
  const threadMeta = threadsResult?.meta;
  const members = membersResult?.data ?? [];
  const memberMeta = membersResult?.meta;

  // -------------------------------------------------------------------------
  // Handlers - Threads
  // -------------------------------------------------------------------------

  const handleCreateThread = () => {
    if (!threadForm.title.trim() || !threadForm.author_id) return;
    createThread(
      {
        spaceId,
        title: threadForm.title,
        author_id: threadForm.author_id,
        type: threadForm.type,
        content: threadForm.content,
      },
      {
        onSuccess: () => {
          setShowCreateThread(false);
          setThreadForm(emptyThreadForm);
        },
      }
    );
  };

  const handleDeleteThread = (threadId: number) => {
    deleteThread(threadId, {
      onSuccess: () => setDeletingThreadId(null),
    });
  };

  const handlePinThread = (threadId: number) => {
    pinThread(threadId);
  };

  const handleCloseThread = (threadId: number) => {
    closeThread(threadId);
  };

  // -------------------------------------------------------------------------
  // Handlers - Members
  // -------------------------------------------------------------------------

  const handleAddMember = () => {
    if (!memberForm.contact_id) return;
    addMember(
      {
        spaceId,
        contactId: memberForm.contact_id,
        role: memberForm.role,
      },
      {
        onSuccess: () => {
          setShowAddMember(false);
          setMemberForm(emptyMemberForm);
        },
      }
    );
  };

  const handleRemoveMember = async (memberId: number) => {
    const ok = await confirm({
      title: "Remove Member",
      description: "Remove this member from the space?",
      confirmLabel: "Remove",
      variant: "danger",
    });
    if (ok) {
      removeMember(memberId);
    }
  };

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  if (spaceLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!space) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <p className="text-text-secondary">Space not found.</p>
        <Link href="/community" className="text-accent hover:underline text-sm">
          Back to community
        </Link>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* ================================================================= */}
      {/* HEADER                                                            */}
      {/* ================================================================= */}
      <div className="flex items-center gap-4">
        <Link
          href="/community"
          className="rounded-lg p-1.5 hover:bg-bg-hover text-text-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            {space.icon && (
              <span className="text-2xl" role="img">
                {space.icon}
              </span>
            )}
            <h1 className="text-2xl font-bold text-foreground truncate">
              {space.name}
            </h1>
          </div>
          {space.description && (
            <p className="text-sm text-text-secondary mt-1 line-clamp-2">
              {space.description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${spaceTypeBadge(space.type)}`}
            >
              {space.type}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-text-muted">
              <Users className="h-3.5 w-3.5" />
              {space.member_count ?? 0} member{(space.member_count ?? 0) !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-text-muted">
              <MessageCircle className="h-3.5 w-3.5" />
              {space.thread_count ?? 0} thread{(space.thread_count ?? 0) !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* TABS                                                              */}
      {/* ================================================================= */}
      <div className="border-b border-border">
        <nav className="flex gap-6">
          {(["threads", "members"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative pb-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "text-accent"
                  : "text-text-muted hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-2">
                {tab === "threads" ? (
                  <MessageCircle className="h-4 w-4" />
                ) : (
                  <Users className="h-4 w-4" />
                )}
                {tab}
              </span>
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-accent" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ================================================================= */}
      {/* TAB 1: THREADS                                                    */}
      {/* ================================================================= */}
      {activeTab === "threads" && (
        <div className="space-y-4">
          {/* Toolbar: sort + filter + create */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Sort */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-muted font-medium">Sort:</label>
              <select
                value={threadSort}
                onChange={(e) => {
                  setThreadSort(e.target.value as ThreadSort);
                  setThreadPage(1);
                }}
                className="rounded-lg border border-border bg-bg-elevated px-3 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
              >
                <option value="recent">Recent Activity</option>
                <option value="popular">Most Popular</option>
                <option value="newest">Newest</option>
              </select>
            </div>

            {/* Type filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-text-muted" />
              <select
                value={threadTypeFilter}
                onChange={(e) => {
                  setThreadTypeFilter(e.target.value as ThreadTypeFilter);
                  setThreadPage(1);
                }}
                className="rounded-lg border border-border bg-bg-elevated px-3 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
              >
                <option value="">All Types</option>
                <option value="discussion">Discussion</option>
                <option value="question">Question</option>
                <option value="announcement">Announcement</option>
              </select>
            </div>

            <div className="flex-1" />

            {/* Create thread */}
            <button
              onClick={() => setShowCreateThread(true)}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Thread
            </button>
          </div>

          {/* Thread list */}
          {threads.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-bg-secondary p-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                  <MessageCircle className="h-7 w-7 text-accent" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                No threads yet
              </h3>
              <p className="text-sm text-text-muted mb-5">
                Start the conversation by creating the first thread.
              </p>
              <button
                onClick={() => setShowCreateThread(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Thread
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {threads.map((thread) => (
                <div
                  key={thread.id}
                  className={`rounded-xl border bg-bg-secondary p-4 transition-colors hover:bg-bg-hover ${
                    thread.status === "pinned"
                      ? "border-accent/30"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Thread content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {thread.status === "pinned" && (
                          <Pin className="h-3.5 w-3.5 text-accent shrink-0" />
                        )}
                        <h3 className="font-semibold text-foreground truncate">
                          {thread.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {/* Author */}
                        <span className="text-sm text-text-secondary">
                          {thread.author
                            ? `${thread.author.first_name} ${thread.author.last_name}`
                            : `User #${thread.author_id}`}
                        </span>

                        {/* Type badge */}
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${threadTypeBadge(thread.type)}`}
                        >
                          {thread.type}
                        </span>

                        {/* Status badge */}
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${threadStatusBadge(thread.status)}`}
                        >
                          {thread.status}
                        </span>
                      </div>

                      {/* Stats row */}
                      <div className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1 text-xs text-text-muted">
                          <Heart className="h-3.5 w-3.5" />
                          {thread.like_count}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-text-muted">
                          <MessageSquare className="h-3.5 w-3.5" />
                          {thread.reply_count}
                        </span>
                        <span className="text-xs text-text-muted">
                          {timeAgo(thread.last_activity_at || thread.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Thread actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Pin / Unpin */}
                      <button
                        onClick={() => handlePinThread(thread.id)}
                        className={`rounded-lg p-1.5 transition-colors ${
                          thread.status === "pinned"
                            ? "text-accent hover:bg-accent/10"
                            : "text-text-muted hover:bg-bg-elevated hover:text-foreground"
                        }`}
                        title={thread.status === "pinned" ? "Unpin thread" : "Pin thread"}
                      >
                        <Pin className="h-4 w-4" />
                      </button>

                      {/* Close / Reopen */}
                      <button
                        onClick={() => handleCloseThread(thread.id)}
                        className={`rounded-lg p-1.5 transition-colors ${
                          thread.status === "closed"
                            ? "text-success hover:bg-success/10"
                            : "text-text-muted hover:bg-bg-elevated hover:text-foreground"
                        }`}
                        title={thread.status === "closed" ? "Reopen thread" : "Close thread"}
                      >
                        {thread.status === "closed" ? (
                          <Unlock className="h-4 w-4" />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                      </button>

                      {/* Delete */}
                      {deletingThreadId === thread.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDeleteThread(thread.id)}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-danger bg-danger/10 hover:bg-danger/20 transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeletingThreadId(null)}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-text-muted hover:bg-bg-elevated transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingThreadId(thread.id)}
                          className="rounded-lg p-1.5 text-text-muted hover:bg-danger/10 hover:text-danger transition-colors"
                          title="Delete thread"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Thread pagination */}
          {threadMeta && threadMeta.pages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-text-muted">
                Page {threadMeta.page} of {threadMeta.pages} ({threadMeta.total} thread
                {threadMeta.total !== 1 ? "s" : ""})
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setThreadPage((p) => Math.max(1, p - 1))}
                  disabled={threadMeta.page <= 1}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-bg-hover disabled:opacity-50 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setThreadPage((p) => Math.min(threadMeta.pages, p + 1))}
                  disabled={threadMeta.page >= threadMeta.pages}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-bg-hover disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: MEMBERS                                                    */}
      {/* ================================================================= */}
      {activeTab === "members" && (
        <div className="space-y-4">
          {/* Members header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Members</h2>
              <p className="text-sm text-text-muted mt-0.5">
                {memberMeta?.total ?? members.length} member
                {(memberMeta?.total ?? members.length) !== 1 ? "s" : ""} in this space
              </p>
            </div>
            <button
              onClick={() => setShowAddMember(true)}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Member
            </button>
          </div>

          {/* Members list */}
          {membersLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : members.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-bg-secondary p-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                  <Users className="h-7 w-7 text-accent" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                No members yet
              </h3>
              <p className="text-sm text-text-muted mb-5">
                Add the first member to this community space.
              </p>
              <button
                onClick={() => setShowAddMember(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Member
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
              <div className="divide-y divide-border">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-bg-hover transition-colors group"
                  >
                    {/* Avatar */}
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent text-sm font-bold shrink-0">
                      {member.contact?.avatar_url ? (
                        <img
                          src={member.contact.avatar_url}
                          alt=""
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        initials(
                          member.contact?.first_name,
                          member.contact?.last_name
                        )
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">
                        {member.contact
                          ? `${member.contact.first_name} ${member.contact.last_name}`
                          : `Contact #${member.contact_id}`}
                      </p>
                      {member.contact?.email && (
                        <p className="text-xs text-text-muted truncate">
                          {member.contact.email}
                        </p>
                      )}
                    </div>

                    {/* Role badge */}
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-medium capitalize shrink-0 ${roleBadge(member.role)}`}
                    >
                      {member.role}
                    </span>

                    {/* Joined date */}
                    <span className="text-xs text-text-muted shrink-0 hidden sm:block">
                      Joined {formatDate(member.joined_at)}
                    </span>

                    {/* Remove button */}
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="rounded-lg p-1.5 text-text-muted hover:bg-danger/10 hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove member"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Member pagination */}
          {memberMeta && memberMeta.pages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-text-muted">
                Page {memberMeta.page} of {memberMeta.pages} ({memberMeta.total} member
                {memberMeta.total !== 1 ? "s" : ""})
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMemberPage((p) => Math.max(1, p - 1))}
                  disabled={memberMeta.page <= 1}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-bg-hover disabled:opacity-50 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setMemberPage((p) => Math.min(memberMeta.pages, p + 1))}
                  disabled={memberMeta.page >= memberMeta.pages}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-bg-hover disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* CREATE THREAD MODAL                                               */}
      {/* ================================================================= */}
      {showCreateThread && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl border border-border bg-bg-secondary p-6 shadow-2xl mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-foreground">
                Create Thread
              </h2>
              <button
                onClick={() => {
                  setShowCreateThread(false);
                  setThreadForm(emptyThreadForm);
                }}
                className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={threadForm.title}
                  onChange={(e) =>
                    setThreadForm({ ...threadForm, title: e.target.value })
                  }
                  placeholder="Thread title"
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Author ID
                </label>
                <input
                  type="number"
                  min={1}
                  value={threadForm.author_id || ""}
                  onChange={(e) =>
                    setThreadForm({
                      ...threadForm,
                      author_id: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="Contact ID of the thread author"
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Type
                </label>
                <select
                  value={threadForm.type}
                  onChange={(e) =>
                    setThreadForm({
                      ...threadForm,
                      type: e.target.value as NewThreadForm["type"],
                    })
                  }
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="discussion">Discussion</option>
                  <option value="question">Question</option>
                  <option value="announcement">Announcement</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Content
                </label>
                <textarea
                  value={threadForm.content}
                  onChange={(e) =>
                    setThreadForm({ ...threadForm, content: e.target.value })
                  }
                  placeholder="Write the thread content..."
                  rows={4}
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none resize-y"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowCreateThread(false);
                  setThreadForm(emptyThreadForm);
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateThread}
                disabled={
                  !threadForm.title.trim() || !threadForm.author_id || creatingThread
                }
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                {creatingThread ? "Creating..." : "Create Thread"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* ADD MEMBER MODAL                                                  */}
      {/* ================================================================= */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-bg-secondary p-6 shadow-2xl mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-foreground">
                Add Member
              </h2>
              <button
                onClick={() => {
                  setShowAddMember(false);
                  setMemberForm(emptyMemberForm);
                }}
                className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Contact ID
                </label>
                <input
                  type="number"
                  min={1}
                  value={memberForm.contact_id || ""}
                  onChange={(e) =>
                    setMemberForm({
                      ...memberForm,
                      contact_id: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="Enter the contact ID"
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Role
                </label>
                <select
                  value={memberForm.role}
                  onChange={(e) =>
                    setMemberForm({
                      ...memberForm,
                      role: e.target.value as AddMemberForm["role"],
                    })
                  }
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="member">Member</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowAddMember(false);
                  setMemberForm(emptyMemberForm);
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={!memberForm.contact_id || addingMember}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                {addingMember ? "Adding..." : "Add Member"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
