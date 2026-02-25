"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Loader2,
  X,
  Calendar,
  Clock,
  CalendarCheck,
  User,
  Check,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "@/lib/icons";
import {
  useCalendars,
  useCreateCalendar,
  useDeleteCalendar,
  useAppointments,
  useCancelAppointment,
  useCompleteAppointment,
  useRescheduleAppointment,
} from "@/hooks/use-booking";
import type { Calendar as CalendarType, Appointment } from "@repo/shared/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type MainTab = "calendars" | "appointments";

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Rescheduled", value: "rescheduled" },
  { label: "Completed", value: "completed" },
] as const;

const statusBadge: Record<string, string> = {
  active: "bg-green-500/10 text-green-400",
  inactive: "bg-zinc-500/10 text-zinc-400",
  confirmed: "bg-accent/10 text-accent",
  cancelled: "bg-red-500/10 text-red-400",
  rescheduled: "bg-yellow-500/10 text-yellow-400",
  completed: "bg-green-500/10 text-green-400",
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function minutesBetween(a: string, b: string) {
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / 60000
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BookingPage() {
  const [activeTab, setActiveTab] = useState<MainTab>("calendars");

  // ---- Calendars state ----
  const { data: calendars, isLoading: loadingCalendars } = useCalendars();
  const { mutate: createCalendar } = useCreateCalendar();
  const { mutate: deleteCalendar } = useDeleteCalendar();

  const [showCreateCal, setShowCreateCal] = useState(false);
  const [newCalName, setNewCalName] = useState("");
  const [newCalTimezone, setNewCalTimezone] = useState("UTC");
  const [newCalDescription, setNewCalDescription] = useState("");

  // ---- Appointments state ----
  const [apptPage, setApptPage] = useState(1);
  const [apptStatus, setApptStatus] = useState("");
  const [apptUpcoming, setApptUpcoming] = useState(false);

  const { data: apptData, isLoading: loadingAppts } = useAppointments(
    apptPage,
    apptStatus,
    apptUpcoming
  );
  const { mutate: cancelAppt } = useCancelAppointment();
  const { mutate: completeAppt } = useCompleteAppointment();
  const { mutate: rescheduleAppt } = useRescheduleAppointment();

  const appointments = apptData?.data ?? [];
  const apptMeta = apptData?.meta;

  // ---- Reschedule modal ----
  const [rescheduleId, setRescheduleId] = useState<number | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");

  // ---- Handlers ----

  const handleCreateCalendar = () => {
    createCalendar(
      {
        name: newCalName,
        timezone: newCalTimezone,
        description: newCalDescription,
      },
      {
        onSuccess: () => {
          setShowCreateCal(false);
          setNewCalName("");
          setNewCalTimezone("UTC");
          setNewCalDescription("");
        },
      }
    );
  };

  const handleDeleteCalendar = (id: number) => {
    if (confirm("Delete this calendar? This cannot be undone.")) {
      deleteCalendar(id);
    }
  };

  const handleReschedule = () => {
    if (rescheduleId && rescheduleDate) {
      rescheduleAppt(
        { id: rescheduleId, start_at: new Date(rescheduleDate).toISOString() },
        {
          onSuccess: () => {
            setRescheduleId(null);
            setRescheduleDate("");
          },
        }
      );
    }
  };

  // ---- Render ----

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Booking</h1>
          <p className="text-text-secondary mt-1">
            Manage calendars and appointments.
          </p>
        </div>
        {activeTab === "calendars" && (
          <button
            onClick={() => setShowCreateCal(true)}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Calendar
          </button>
        )}
      </div>

      {/* Main tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-6">
          {(["calendars", "appointments"] as MainTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative pb-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "text-accent"
                  : "text-text-muted hover:text-foreground"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-accent" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ================================================================= */}
      {/* CALENDARS TAB                                                     */}
      {/* ================================================================= */}
      {activeTab === "calendars" && (
        <>
          {loadingCalendars ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : !calendars || calendars.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-bg-secondary p-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                  <Calendar className="h-7 w-7 text-accent" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                No calendars yet
              </h3>
              <p className="text-sm text-text-muted mb-5">
                Create your first calendar to start managing bookings.
              </p>
              <button
                onClick={() => setShowCreateCal(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Calendar
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {calendars.map((cal) => (
                <div
                  key={cal.id}
                  className="rounded-xl border border-border bg-bg-secondary p-5 hover:border-accent/30 transition-colors group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 shrink-0">
                        <Calendar className="h-5 w-5 text-accent" />
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/booking/${cal.id}`}
                          className="font-semibold text-foreground hover:text-accent transition-colors block truncate"
                        >
                          {cal.name}
                        </Link>
                        <p className="text-xs text-text-muted truncate">
                          {cal.timezone}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        statusBadge[cal.status] ?? "bg-bg-elevated text-text-muted"
                      }`}
                    >
                      {cal.status}
                    </span>
                  </div>

                  {cal.description && (
                    <p className="text-sm text-text-secondary mb-3 line-clamp-2">
                      {cal.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <span className="text-xs text-text-muted">
                      {cal.event_types?.length ?? 0} event type
                      {(cal.event_types?.length ?? 0) !== 1 ? "s" : ""}
                    </span>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/booking/${cal.id}`}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-foreground transition-colors"
                        title="Manage"
                      >
                        <CalendarCheck className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDeleteCalendar(cal.id)}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ================================================================= */}
      {/* APPOINTMENTS TAB                                                  */}
      {/* ================================================================= */}
      {activeTab === "appointments" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 rounded-lg border border-border bg-bg-secondary p-1">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setApptStatus(opt.value);
                      setApptPage(1);
                    }}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      apptStatus === opt.value
                        ? "bg-accent text-white"
                        : "text-text-muted hover:text-foreground hover:bg-bg-hover"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setApptUpcoming(!apptUpcoming);
                setApptPage(1);
              }}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                apptUpcoming
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-text-muted hover:text-foreground hover:bg-bg-hover"
              }`}
            >
              <Clock className="h-4 w-4" />
              Upcoming only
            </button>
          </div>

          {/* Appointments table */}
          {loadingAppts ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-elevated">
                    <th className="px-4 py-3 text-left font-medium text-text-muted">
                      Date / Time
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-text-muted">
                      Event Type
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-text-muted">
                      Contact
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-text-muted">
                      Duration
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-text-muted">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-text-muted">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appt) => (
                    <tr
                      key={appt.id}
                      className="border-b border-border/50 hover:bg-bg-hover transition-colors"
                    >
                      {/* Date/Time */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-text-muted shrink-0" />
                          <span className="text-foreground">
                            {formatDateTime(appt.start_at)}
                          </span>
                        </div>
                      </td>

                      {/* Event Type */}
                      <td className="px-4 py-3 text-text-secondary">
                        {appt.event_type?.name ?? `Type #${appt.event_type_id}`}
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 shrink-0">
                            <User className="h-3.5 w-3.5 text-accent" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {appt.contact
                                ? `${appt.contact.first_name} ${appt.contact.last_name}`
                                : `Contact #${appt.contact_id}`}
                            </p>
                            {appt.contact?.email && (
                              <p className="text-xs text-text-muted truncate">
                                {appt.contact.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-3 text-text-secondary">
                        {minutesBetween(appt.start_at, appt.end_at)} min
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                            statusBadge[appt.status] ??
                            "bg-bg-elevated text-text-muted"
                          }`}
                        >
                          {appt.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {appt.status === "confirmed" && (
                            <>
                              <button
                                onClick={() =>
                                  completeAppt(appt.id)
                                }
                                className="rounded-lg p-1.5 text-text-muted hover:bg-green-500/10 hover:text-green-400 transition-colors"
                                title="Mark complete"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setRescheduleId(appt.id);
                                  setRescheduleDate("");
                                }}
                                className="rounded-lg p-1.5 text-text-muted hover:bg-yellow-500/10 hover:text-yellow-400 transition-colors"
                                title="Reschedule"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm("Cancel this appointment?"))
                                    cancelAppt(appt.id);
                                }}
                                className="rounded-lg p-1.5 text-text-muted hover:bg-red-500/10 hover:text-red-400 transition-colors"
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {appt.status === "rescheduled" && (
                            <>
                              <button
                                onClick={() =>
                                  completeAppt(appt.id)
                                }
                                className="rounded-lg p-1.5 text-text-muted hover:bg-green-500/10 hover:text-green-400 transition-colors"
                                title="Mark complete"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm("Cancel this appointment?"))
                                    cancelAppt(appt.id);
                                }}
                                className="rounded-lg p-1.5 text-text-muted hover:bg-red-500/10 hover:text-red-400 transition-colors"
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {appointments.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-text-muted"
                      >
                        No appointments found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {apptMeta && apptMeta.pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <p className="text-sm text-text-muted">
                    {apptMeta.total} appointment
                    {apptMeta.total !== 1 ? "s" : ""} total
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setApptPage((p) => Math.max(1, p - 1))}
                      disabled={apptPage <= 1}
                      className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    {Array.from({ length: apptMeta.pages }, (_, i) => i + 1).map(
                      (p) => (
                        <button
                          key={p}
                          onClick={() => setApptPage(p)}
                          className={`rounded-lg px-3 py-1 text-sm ${
                            p === apptPage
                              ? "bg-accent text-white"
                              : "text-text-muted hover:bg-bg-hover"
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                    <button
                      onClick={() =>
                        setApptPage((p) => Math.min(apptMeta.pages, p + 1))
                      }
                      disabled={apptPage >= apptMeta.pages}
                      className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* CREATE CALENDAR MODAL                                             */}
      {/* ================================================================= */}
      {showCreateCal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-bg-elevated p-6 space-y-4 mx-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Create Calendar
              </h2>
              <button
                onClick={() => setShowCreateCal(false)}
                className="rounded-lg p-1 text-text-muted hover:bg-bg-hover hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Name
              </label>
              <input
                type="text"
                placeholder="My Calendar"
                value={newCalName}
                onChange={(e) => setNewCalName(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Timezone
              </label>
              <input
                type="text"
                placeholder="America/New_York"
                value={newCalTimezone}
                onChange={(e) => setNewCalTimezone(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Description
              </label>
              <textarea
                placeholder="Optional description..."
                value={newCalDescription}
                onChange={(e) => setNewCalDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none resize-y"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreateCal(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCalendar}
                disabled={!newCalName.trim()}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* RESCHEDULE MODAL                                                  */}
      {/* ================================================================= */}
      {rescheduleId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl border border-border bg-bg-elevated p-6 space-y-4 mx-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Reschedule Appointment
              </h2>
              <button
                onClick={() => {
                  setRescheduleId(null);
                  setRescheduleDate("");
                }}
                className="rounded-lg p-1 text-text-muted hover:bg-bg-hover hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                New Date & Time
              </label>
              <input
                type="datetime-local"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setRescheduleId(null);
                  setRescheduleDate("");
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
              >
                Cancel
              </button>
              <button
                onClick={handleReschedule}
                disabled={!rescheduleDate}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
              >
                Reschedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
