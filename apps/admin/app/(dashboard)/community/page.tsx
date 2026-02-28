"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useSpaces,
  useCreateSpace,
  useUpdateSpace,
  useDeleteSpace,
  useCommunityEvents,
  useCreateCommunityEvent,
  useDeleteCommunityEvent,
} from "@/hooks/use-community";
import {
  Plus,
  Trash2,
  Pencil,
  Loader2,
  X,
  Calendar,
  Users,
  MessageCircle,
  Globe,
  Lock,
  CreditCard,
  ExternalLink,
  Clock,
} from "@/lib/icons";
import { getIcon } from "@/lib/icons";
import { useConfirm } from "@/hooks/use-confirm";
import type { Space, CommunityEvent } from "@repo/shared/types";

const typeBadge: Record<string, string> = {
  public: "bg-green-500/10 text-green-400",
  private: "bg-yellow-500/10 text-yellow-400",
  paid: "bg-accent/10 text-accent",
};

const typeIcon: Record<string, typeof Globe> = {
  public: Globe,
  private: Lock,
  paid: CreditCard,
};

const eventStatusBadge: Record<string, string> = {
  upcoming: "bg-blue-500/10 text-blue-400",
  live: "bg-green-500/10 text-green-400",
  completed: "bg-zinc-500/10 text-zinc-400",
  cancelled: "bg-red-500/10 text-red-400",
};

const eventTypeBadge: Record<string, string> = {
  virtual: "bg-purple-500/10 text-purple-400",
  in_person: "bg-orange-500/10 text-orange-400",
};

function formatDateTime(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface SpaceModalState {
  open: boolean;
  editing: Space | null;
}

interface EventModalState {
  open: boolean;
}

export default function CommunityPage() {
  const confirm = useConfirm();
  // --- Spaces state ---
  const { data: spaces, isLoading: spacesLoading } = useSpaces();
  const { mutate: createSpace } = useCreateSpace();
  const { mutate: updateSpace } = useUpdateSpace();
  const { mutate: deleteSpace } = useDeleteSpace();

  const [spaceModal, setSpaceModal] = useState<SpaceModalState>({
    open: false,
    editing: null,
  });
  const [spaceName, setSpaceName] = useState("");
  const [spaceDescription, setSpaceDescription] = useState("");
  const [spaceType, setSpaceType] = useState<"public" | "private" | "paid">("public");
  const [spaceIcon, setSpaceIcon] = useState("MessageCircle");
  const [spaceColor, setSpaceColor] = useState("#6366f1");

  // --- Events state ---
  const { data: events, isLoading: eventsLoading } = useCommunityEvents();
  const { mutate: createEvent } = useCreateCommunityEvent();
  const { mutate: deleteEvent } = useDeleteCommunityEvent();

  const [eventModal, setEventModal] = useState<EventModalState>({ open: false });
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventType, setEventType] = useState<"virtual" | "in_person">("virtual");
  const [eventSpaceId, setEventSpaceId] = useState<number>(0);
  const [eventStartAt, setEventStartAt] = useState("");
  const [eventEndAt, setEventEndAt] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventUrl, setEventUrl] = useState("");
  const [eventMaxAttendees, setEventMaxAttendees] = useState("");
  const [eventStatus, setEventStatus] = useState<
    "upcoming" | "live" | "completed" | "cancelled"
  >("upcoming");

  // --- Space modal helpers ---
  function openCreateSpace() {
    setSpaceName("");
    setSpaceDescription("");
    setSpaceType("public");
    setSpaceIcon("MessageCircle");
    setSpaceColor("#6366f1");
    setSpaceModal({ open: true, editing: null });
  }

  function openEditSpace(space: Space) {
    setSpaceName(space.name);
    setSpaceDescription(space.description || "");
    setSpaceType(space.type);
    setSpaceIcon(space.icon || "MessageCircle");
    setSpaceColor(space.color || "#6366f1");
    setSpaceModal({ open: true, editing: space });
  }

  function handleSaveSpace() {
    const body: Partial<Space> = {
      name: spaceName,
      description: spaceDescription,
      type: spaceType,
      icon: spaceIcon,
      color: spaceColor,
    };

    if (spaceModal.editing) {
      updateSpace(
        { id: spaceModal.editing.id, ...body },
        { onSuccess: () => setSpaceModal({ open: false, editing: null }) }
      );
    } else {
      createSpace(body, {
        onSuccess: () => setSpaceModal({ open: false, editing: null }),
      });
    }
  }

  // --- Event modal helpers ---
  function openCreateEvent() {
    setEventTitle("");
    setEventDescription("");
    setEventType("virtual");
    setEventSpaceId(spaces?.[0]?.id ?? 0);
    setEventStartAt("");
    setEventEndAt("");
    setEventLocation("");
    setEventUrl("");
    setEventMaxAttendees("");
    setEventStatus("upcoming");
    setEventModal({ open: true });
  }

  function handleSaveEvent() {
    const body: Partial<CommunityEvent> = {
      title: eventTitle,
      description: eventDescription,
      type: eventType,
      space_id: eventSpaceId || undefined,
      start_at: eventStartAt ? new Date(eventStartAt).toISOString() : undefined,
      end_at: eventEndAt ? new Date(eventEndAt).toISOString() : undefined,
      location: eventLocation || undefined,
      url: eventUrl || undefined,
      max_attendees: eventMaxAttendees ? parseInt(eventMaxAttendees, 10) : undefined,
      status: eventStatus,
    };

    createEvent(body, {
      onSuccess: () => setEventModal({ open: false }),
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Community</h1>
        <p className="text-text-secondary mt-1">
          Manage spaces, discussions, and community events.
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Spaces (wider) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Spaces</h2>
            <button
              onClick={openCreateSpace}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Space
            </button>
          </div>

          {spacesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : !spaces || spaces.length === 0 ? (
            <div className="rounded-xl border border-border bg-bg-secondary p-8 text-center">
              <p className="text-text-muted">
                No spaces yet. Create your first community space.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {spaces.map((space) => {
                const SpaceIcon = getIcon(space.icon || "MessageCircle");
                const TypeIcon = typeIcon[space.type] ?? Globe;

                return (
                  <div
                    key={space.id}
                    className="rounded-xl border border-border bg-bg-secondary p-4 hover:bg-bg-hover transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      {/* Colored icon circle */}
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                        style={{ backgroundColor: `${space.color || "#6366f1"}20` }}
                      >
                        <SpaceIcon
                          className="h-5 w-5"
                          style={{ color: space.color || "#6366f1" }}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/community/${space.id}`}
                            className="font-medium text-foreground hover:text-accent truncate"
                          >
                            {space.name}
                          </Link>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                              typeBadge[space.type] ?? "bg-bg-elevated text-text-muted"
                            }`}
                          >
                            <TypeIcon className="h-3 w-3" />
                            {space.type}
                          </span>
                        </div>

                        {space.description && (
                          <p className="text-sm text-text-muted mt-1 line-clamp-2">
                            {space.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {space.member_count ?? 0} members
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3.5 w-3.5" />
                            {space.thread_count ?? 0} threads
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={() => openEditSpace(space)}
                          className="rounded-lg p-1.5 text-text-muted hover:bg-bg-elevated hover:text-foreground"
                          title="Edit space"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={async () => {
                            const ok = await confirm({
                              title: "Delete Space",
                              description: `Delete "${space.name}"? This cannot be undone.`,
                              confirmLabel: "Delete",
                              variant: "danger",
                            });
                            if (ok) deleteSpace(space.id);
                          }}
                          className="rounded-lg p-1.5 text-text-muted hover:bg-red-500/10 hover:text-red-400"
                          title="Delete space"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Upcoming Events */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Events</h2>
            <button
              onClick={openCreateEvent}
              className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Event
            </button>
          </div>

          {eventsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : !events || events.length === 0 ? (
            <div className="rounded-xl border border-border bg-bg-secondary p-8 text-center">
              <p className="text-text-muted">No events yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-border bg-bg-secondary p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-foreground text-sm leading-tight">
                      {event.title}
                    </h3>
                    <button
                      onClick={async () => {
                        const ok = await confirm({
                          title: "Delete Event",
                          description: `Delete event "${event.title}"? This cannot be undone.`,
                          confirmLabel: "Delete",
                          variant: "danger",
                        });
                        if (ok) deleteEvent(event.id);
                      }}
                      className="rounded-lg p-1 text-text-muted hover:bg-red-500/10 hover:text-red-400 flex-shrink-0"
                      title="Delete event"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        eventStatusBadge[event.status] ??
                        "bg-bg-elevated text-text-muted"
                      }`}
                    >
                      {event.status}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        eventTypeBadge[event.type] ??
                        "bg-bg-elevated text-text-muted"
                      }`}
                    >
                      {event.type === "in_person" ? "In Person" : "Virtual"}
                    </span>
                  </div>

                  {/* Date/Time */}
                  {event.start_at && (
                    <div className="flex items-center gap-1.5 text-xs text-text-muted">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatDateTime(event.start_at)}</span>
                      {event.end_at && (
                        <>
                          <span>-</span>
                          <span>{formatDateTime(event.end_at)}</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Attendees */}
                  <div className="flex items-center gap-1.5 text-xs text-text-muted">
                    <Users className="h-3.5 w-3.5" />
                    <span>
                      {event.attendee_count ?? 0} attendee
                      {(event.attendee_count ?? 0) !== 1 ? "s" : ""}
                      {event.max_attendees
                        ? ` / ${event.max_attendees} max`
                        : ""}
                    </span>
                  </div>

                  {/* Location / URL */}
                  {event.location && (
                    <p className="text-xs text-text-muted truncate">
                      {event.location}
                    </p>
                  )}
                  {event.url && (
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Event link
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ==================== Space Create/Edit Modal ==================== */}
      {spaceModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-bg-elevated p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {spaceModal.editing ? "Edit Space" : "Create Space"}
              </h2>
              <button
                onClick={() => setSpaceModal({ open: false, editing: null })}
                className="rounded-lg p-1 text-text-muted hover:bg-bg-hover hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Name
              </label>
              <input
                type="text"
                placeholder="General Discussion"
                value={spaceName}
                onChange={(e) => setSpaceName(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Description
              </label>
              <textarea
                placeholder="What is this space about?"
                value={spaceDescription}
                onChange={(e) => setSpaceDescription(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Type
              </label>
              <select
                value={spaceType}
                onChange={(e) =>
                  setSpaceType(e.target.value as "public" | "private" | "paid")
                }
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            {/* Icon + Color row */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Icon
                </label>
                <input
                  type="text"
                  placeholder="MessageCircle"
                  value={spaceIcon}
                  onChange={(e) => setSpaceIcon(e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>
              <div className="w-28">
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Color
                </label>
                <input
                  type="color"
                  value={spaceColor}
                  onChange={(e) => setSpaceColor(e.target.value)}
                  className="h-[38px] w-full rounded-lg border border-border bg-bg-secondary px-1 py-1 cursor-pointer"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSpaceModal({ open: false, editing: null })}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSpace}
                disabled={!spaceName.trim()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
              >
                {spaceModal.editing ? "Save Changes" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== Event Create Modal ==================== */}
      {eventModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl border border-border bg-bg-elevated p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Create Event
              </h2>
              <button
                onClick={() => setEventModal({ open: false })}
                className="rounded-lg p-1 text-text-muted hover:bg-bg-hover hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Title
              </label>
              <input
                type="text"
                placeholder="Community Meetup"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Description
              </label>
              <textarea
                placeholder="Describe the event..."
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </div>

            {/* Type + Space row */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Type
                </label>
                <select
                  value={eventType}
                  onChange={(e) =>
                    setEventType(e.target.value as "virtual" | "in_person")
                  }
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="virtual">Virtual</option>
                  <option value="in_person">In Person</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Space
                </label>
                <select
                  value={eventSpaceId}
                  onChange={(e) => setEventSpaceId(parseInt(e.target.value, 10))}
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                >
                  <option value={0}>No space</option>
                  {(spaces ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Status
              </label>
              <select
                value={eventStatus}
                onChange={(e) =>
                  setEventStatus(
                    e.target.value as
                      | "upcoming"
                      | "live"
                      | "completed"
                      | "cancelled"
                  )
                }
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              >
                <option value="upcoming">Upcoming</option>
                <option value="live">Live</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Start + End datetime row */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Start
                </label>
                <input
                  type="datetime-local"
                  value={eventStartAt}
                  onChange={(e) => setEventStartAt(e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  End
                </label>
                <input
                  type="datetime-local"
                  value={eventEndAt}
                  onChange={(e) => setEventEndAt(e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Location
              </label>
              <input
                type="text"
                placeholder="123 Main St or Online"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </div>

            {/* URL */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                URL
              </label>
              <input
                type="url"
                placeholder="https://zoom.us/..."
                value={eventUrl}
                onChange={(e) => setEventUrl(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </div>

            {/* Max Attendees */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Max Attendees
              </label>
              <input
                type="number"
                min="0"
                placeholder="Unlimited if empty"
                value={eventMaxAttendees}
                onChange={(e) => setEventMaxAttendees(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEventModal({ open: false })}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEvent}
                disabled={!eventTitle.trim()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
