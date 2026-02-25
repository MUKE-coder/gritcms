"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  Pencil,
  X,
  Calendar,
  Clock,
  CalendarCheck,
  Settings,
} from "@/lib/icons";
import {
  useCalendar,
  useUpdateCalendar,
  useCreateEventType,
  useUpdateEventType,
  useDeleteEventType,
  useSetAvailability,
} from "@/hooks/use-booking";
import type { BookingEventType, Availability } from "@repo/shared/types";

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

type Tab = "event-types" | "availability" | "settings";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface EventTypeForm {
  name: string;
  description: string;
  duration_minutes: number;
  buffer_before: number;
  buffer_after: number;
  max_per_day: number;
  price: number;
  color: string;
}

const emptyEventTypeForm: EventTypeForm = {
  name: "",
  description: "",
  duration_minutes: 30,
  buffer_before: 0,
  buffer_after: 0,
  max_per_day: 10,
  price: 0,
  color: "#6366f1",
};

interface DaySlot {
  enabled: boolean;
  start_time: string;
  end_time: string;
}

const DEFAULT_SLOTS: DaySlot[] = Array.from({ length: 7 }, (_, i) => ({
  enabled: i >= 1 && i <= 5,
  start_time: "09:00",
  end_time: "17:00",
}));

const COLOR_PRESETS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#64748b",
];

function statusColor(status: string) {
  switch (status) {
    case "active":
      return "bg-green-500/10 text-green-400";
    case "inactive":
      return "bg-zinc-500/10 text-zinc-400";
    default:
      return "bg-bg-elevated text-text-muted";
  }
}

function formatPrice(cents: number) {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function CalendarDetailPage() {
  const params = useParams();
  const calendarId = Number(params.id);

  // Data
  const { data: calendar, isLoading } = useCalendar(calendarId);

  // Mutations
  const { mutate: updateCalendar, isPending: savingCalendar } =
    useUpdateCalendar();
  const { mutate: createEventType } = useCreateEventType();
  const { mutate: updateEventType } = useUpdateEventType();
  const { mutate: deleteEventType } = useDeleteEventType();
  const { mutate: setAvailability, isPending: savingAvailability } =
    useSetAvailability();

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>("event-types");

  // ---- Event Types state ----
  const [showEventTypeModal, setShowEventTypeModal] = useState(false);
  const [editingEventTypeId, setEditingEventTypeId] = useState<number | null>(
    null
  );
  const [eventTypeForm, setEventTypeForm] =
    useState<EventTypeForm>(emptyEventTypeForm);

  // ---- Availability state ----
  const [daySlots, setDaySlots] = useState<DaySlot[]>(DEFAULT_SLOTS);
  const [availabilityInitialized, setAvailabilityInitialized] = useState(false);

  // ---- Settings state ----
  const [settingsName, setSettingsName] = useState("");
  const [settingsDescription, setSettingsDescription] = useState("");
  const [settingsTimezone, setSettingsTimezone] = useState("");
  const [settingsStatus, setSettingsStatus] = useState<"active" | "inactive">(
    "active"
  );
  const [settingsInitialized, setSettingsInitialized] = useState(false);

  // Initialize from fetched data
  if (calendar && !settingsInitialized) {
    setSettingsName(calendar.name ?? "");
    setSettingsDescription(calendar.description ?? "");
    setSettingsTimezone(calendar.timezone ?? "UTC");
    setSettingsStatus(calendar.status ?? "active");
    setSettingsInitialized(true);
  }

  if (calendar && !availabilityInitialized) {
    if (calendar.availabilities && calendar.availabilities.length > 0) {
      const slots = [...DEFAULT_SLOTS];
      for (const av of calendar.availabilities) {
        if (av.day_of_week >= 0 && av.day_of_week <= 6) {
          slots[av.day_of_week] = {
            enabled: true,
            start_time: av.start_time,
            end_time: av.end_time,
          };
        }
      }
      // Mark days without availability as disabled
      const enabledDays = new Set(
        calendar.availabilities.map((a) => a.day_of_week)
      );
      for (let i = 0; i < 7; i++) {
        if (!enabledDays.has(i)) {
          slots[i] = { ...slots[i], enabled: false };
        }
      }
      setDaySlots(slots);
    }
    setAvailabilityInitialized(true);
  }

  // -----------------------------------------------------------------------
  // Event Type Handlers
  // -----------------------------------------------------------------------

  const openAddEventType = () => {
    setEventTypeForm(emptyEventTypeForm);
    setEditingEventTypeId(null);
    setShowEventTypeModal(true);
  };

  const openEditEventType = (et: BookingEventType) => {
    setEventTypeForm({
      name: et.name,
      description: et.description ?? "",
      duration_minutes: et.duration_minutes,
      buffer_before: et.buffer_before,
      buffer_after: et.buffer_after,
      max_per_day: et.max_per_day,
      price: et.price,
      color: et.color ?? "#6366f1",
    });
    setEditingEventTypeId(et.id);
    setShowEventTypeModal(true);
  };

  const handleEventTypeSubmit = () => {
    if (editingEventTypeId) {
      updateEventType(
        { id: editingEventTypeId, ...eventTypeForm },
        {
          onSuccess: () => {
            setShowEventTypeModal(false);
            setEditingEventTypeId(null);
            setEventTypeForm(emptyEventTypeForm);
          },
        }
      );
    } else {
      createEventType(
        { calendarId, ...eventTypeForm },
        {
          onSuccess: () => {
            setShowEventTypeModal(false);
            setEventTypeForm(emptyEventTypeForm);
          },
        }
      );
    }
  };

  const handleDeleteEventType = (id: number) => {
    if (confirm("Delete this event type? This cannot be undone.")) {
      deleteEventType(id);
    }
  };

  // -----------------------------------------------------------------------
  // Availability Handlers
  // -----------------------------------------------------------------------

  const toggleDay = (index: number) => {
    setDaySlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const updateDaySlot = (
    index: number,
    field: "start_time" | "end_time",
    value: string
  ) => {
    setDaySlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const handleSaveAvailability = () => {
    const slots: Partial<Availability>[] = daySlots
      .map((s, i) =>
        s.enabled
          ? {
              day_of_week: i,
              start_time: s.start_time,
              end_time: s.end_time,
            }
          : null
      )
      .filter(Boolean) as Partial<Availability>[];

    setAvailability({ calendarId, slots });
  };

  // -----------------------------------------------------------------------
  // Settings Handler
  // -----------------------------------------------------------------------

  const handleSaveSettings = () => {
    updateCalendar({
      id: calendarId,
      name: settingsName,
      description: settingsDescription,
      timezone: settingsTimezone,
      status: settingsStatus,
    });
  };

  // -----------------------------------------------------------------------
  // Loading / Not found
  // -----------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!calendar) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <p className="text-text-secondary">Calendar not found.</p>
        <Link href="/booking" className="text-accent hover:underline text-sm">
          Back to booking
        </Link>
      </div>
    );
  }

  const eventTypes = calendar.event_types ?? [];

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/booking"
          className="rounded-lg p-1.5 hover:bg-bg-hover text-text-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground truncate">
            {calendar.name}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColor(
                calendar.status
              )}`}
            >
              {calendar.status}
            </span>
            <span className="text-text-muted text-sm">{calendar.timezone}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-6">
          {(
            [
              { key: "event-types", label: "Event Types", icon: CalendarCheck },
              { key: "availability", label: "Availability", icon: Clock },
              { key: "settings", label: "Settings", icon: Settings },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex items-center gap-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "text-accent"
                  : "text-text-muted hover:text-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-accent" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ================================================================= */}
      {/* EVENT TYPES TAB                                                   */}
      {/* ================================================================= */}
      {activeTab === "event-types" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Event Types
              </h2>
              <p className="text-sm text-text-muted mt-0.5">
                Define the types of bookings people can make.
              </p>
            </div>
            <button
              onClick={openAddEventType}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Event Type
            </button>
          </div>

          {eventTypes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-bg-secondary p-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                  <CalendarCheck className="h-7 w-7 text-accent" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                No event types yet
              </h3>
              <p className="text-sm text-text-muted mb-5">
                Add your first event type to this calendar.
              </p>
              <button
                onClick={openAddEventType}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Event Type
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {eventTypes.map((et) => (
                <div
                  key={et.id}
                  className="rounded-xl border border-border bg-bg-secondary p-5 hover:border-accent/30 transition-colors group"
                >
                  {/* Color dot + Name */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: et.color || "#6366f1" }}
                      />
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {et.name}
                        </h3>
                        <p className="text-xs text-text-muted truncate">
                          /{et.slug}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditEventType(et)}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-foreground transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteEventType(et.id)}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {et.description && (
                    <p className="text-sm text-text-secondary mb-3 line-clamp-2">
                      {et.description}
                    </p>
                  )}

                  {/* Meta */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-bg-elevated px-2 py-1 text-text-muted">
                      <Clock className="h-3 w-3" />
                      {et.duration_minutes} min
                    </span>
                    {(et.buffer_before > 0 || et.buffer_after > 0) && (
                      <span className="inline-flex items-center rounded-lg bg-bg-elevated px-2 py-1 text-text-muted">
                        Buffer: {et.buffer_before}/{et.buffer_after} min
                      </span>
                    )}
                    <span className="inline-flex items-center rounded-lg bg-bg-elevated px-2 py-1 text-text-muted">
                      Max {et.max_per_day}/day
                    </span>
                    {et.price > 0 && (
                      <span className="inline-flex items-center rounded-lg bg-green-500/10 px-2 py-1 text-green-400 font-medium">
                        {formatPrice(et.price)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* AVAILABILITY TAB                                                  */}
      {/* ================================================================= */}
      {activeTab === "availability" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Weekly Availability
              </h2>
              <p className="text-sm text-text-muted mt-0.5">
                Set the hours you are available for bookings each day.
              </p>
            </div>
            <button
              onClick={handleSaveAvailability}
              disabled={savingAvailability}
              className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              <Save className="h-4 w-4" />
              {savingAvailability ? "Saving..." : "Save Availability"}
            </button>
          </div>

          <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
            <div className="divide-y divide-border">
              {daySlots.map((slot, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-4 px-5 py-4 transition-colors ${
                    slot.enabled ? "" : "opacity-50"
                  }`}
                >
                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleDay(index)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                      slot.enabled
                        ? "bg-accent"
                        : "bg-bg-elevated border border-border"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                        slot.enabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>

                  {/* Day name */}
                  <span className="w-28 text-sm font-medium text-foreground">
                    {DAY_NAMES[index]}
                  </span>

                  {/* Time inputs */}
                  {slot.enabled ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={slot.start_time}
                        onChange={(e) =>
                          updateDaySlot(index, "start_time", e.target.value)
                        }
                        className="rounded-lg border border-border bg-bg-elevated px-3 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
                      />
                      <span className="text-text-muted text-sm">to</span>
                      <input
                        type="time"
                        value={slot.end_time}
                        onChange={(e) =>
                          updateDaySlot(index, "end_time", e.target.value)
                        }
                        className="rounded-lg border border-border bg-bg-elevated px-3 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-text-muted">Unavailable</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SETTINGS TAB                                                      */}
      {/* ================================================================= */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-bg-secondary p-6 space-y-5">
            <h2 className="text-lg font-semibold text-foreground">
              Calendar Settings
            </h2>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  placeholder="Calendar name"
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Description
                </label>
                <textarea
                  value={settingsDescription}
                  onChange={(e) => setSettingsDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none resize-y"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Timezone
                </label>
                <input
                  type="text"
                  value={settingsTimezone}
                  onChange={(e) => setSettingsTimezone(e.target.value)}
                  placeholder="America/New_York"
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Status
                </label>
                <select
                  value={settingsStatus}
                  onChange={(e) =>
                    setSettingsStatus(
                      e.target.value as "active" | "inactive"
                    )
                  }
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveSettings}
                disabled={savingCalendar || !settingsName.trim()}
                className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                <Save className="h-4 w-4" />
                {savingCalendar ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          {/* Danger zone */}
          <div className="rounded-xl border border-red-500/20 bg-bg-secondary p-6">
            <h3 className="text-sm font-semibold text-red-400 mb-2">
              Danger Zone
            </h3>
            <p className="text-sm text-text-muted mb-4">
              Deleting this calendar will remove all associated event types and
              availability. This action cannot be undone.
            </p>
            <Link
              href="/booking"
              onClick={(e) => {
                if (
                  !confirm(
                    "Are you sure you want to delete this calendar? This cannot be undone."
                  )
                ) {
                  e.preventDefault();
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete Calendar
            </Link>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* EVENT TYPE MODAL                                                  */}
      {/* ================================================================= */}
      {showEventTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl border border-border bg-bg-elevated p-6 shadow-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-foreground">
                {editingEventTypeId ? "Edit Event Type" : "Add Event Type"}
              </h2>
              <button
                onClick={() => {
                  setShowEventTypeModal(false);
                  setEditingEventTypeId(null);
                  setEventTypeForm(emptyEventTypeForm);
                }}
                className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={eventTypeForm.name}
                  onChange={(e) =>
                    setEventTypeForm({ ...eventTypeForm, name: e.target.value })
                  }
                  placeholder="30 Minute Meeting"
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Description
                </label>
                <textarea
                  value={eventTypeForm.description}
                  onChange={(e) =>
                    setEventTypeForm({
                      ...eventTypeForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="A brief description of this event type..."
                  rows={2}
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none resize-y"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Duration (min)
                  </label>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    value={eventTypeForm.duration_minutes}
                    onChange={(e) =>
                      setEventTypeForm({
                        ...eventTypeForm,
                        duration_minutes: parseInt(e.target.value) || 30,
                      })
                    }
                    className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Max Per Day
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={eventTypeForm.max_per_day}
                    onChange={(e) =>
                      setEventTypeForm({
                        ...eventTypeForm,
                        max_per_day: parseInt(e.target.value) || 10,
                      })
                    }
                    className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Buffer Before (min)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={5}
                    value={eventTypeForm.buffer_before}
                    onChange={(e) =>
                      setEventTypeForm({
                        ...eventTypeForm,
                        buffer_before: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Buffer After (min)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={5}
                    value={eventTypeForm.buffer_after}
                    onChange={(e) =>
                      setEventTypeForm({
                        ...eventTypeForm,
                        buffer_after: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Price (cents, 0 = free)
                </label>
                <input
                  type="number"
                  min={0}
                  value={eventTypeForm.price}
                  onChange={(e) =>
                    setEventTypeForm({
                      ...eventTypeForm,
                      price: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Color
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() =>
                        setEventTypeForm({ ...eventTypeForm, color: c })
                      }
                      className={`h-7 w-7 rounded-full border-2 transition-all ${
                        eventTypeForm.color === c
                          ? "border-white scale-110"
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={eventTypeForm.color}
                    onChange={(e) =>
                      setEventTypeForm({
                        ...eventTypeForm,
                        color: e.target.value,
                      })
                    }
                    className="h-7 w-7 rounded-full border-0 bg-transparent cursor-pointer"
                    title="Custom color"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowEventTypeModal(false);
                  setEditingEventTypeId(null);
                  setEventTypeForm(emptyEventTypeForm);
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEventTypeSubmit}
                disabled={!eventTypeForm.name.trim()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                {editingEventTypeId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
