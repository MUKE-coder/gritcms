"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  User,
  Mail,
  FileText,
} from "lucide-react";
import {
  usePublicEventType,
  useAvailableSlots,
  useBookAppointment,
} from "@/hooks/use-booking";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

/** yyyy-MM-dd */
function toDateStr(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function todayStr() {
  const t = new Date();
  return toDateStr(t.getFullYear(), t.getMonth(), t.getDate());
}

/** Format an ISO / HH:mm string to "9:00 AM" */
function formatTime(raw: string) {
  // raw could be "09:00", "09:30:00", or full ISO
  const parts = raw.includes("T") ? raw.split("T")[1].split(":") : raw.split(":");
  let h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${ampm}`;
}

/** Format for confirmation display: "Tuesday, March 4, 2026" */
function formatDateLong(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Mini Calendar                                                     */
/* ------------------------------------------------------------------ */

function MiniCalendar({
  selected,
  onSelect,
  accentColor,
}: {
  selected: string;
  onSelect: (d: string) => void;
  accentColor: string;
}) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const today = todayStr();

  const cells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const blanks: null[] = Array.from({ length: firstDay }, () => null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    return [...blanks, ...days];
  }, [viewYear, viewMonth]);

  function prev() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function next() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  /** Disable past dates */
  function isPast(day: number) {
    return toDateStr(viewYear, viewMonth, day) < today;
  }

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prev}
          className="p-1.5 rounded-lg hover:bg-bg-elevated transition-colors text-text-secondary"
          aria-label="Previous month"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-foreground">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          onClick={next}
          className="p-1.5 rounded-lg hover:bg-bg-elevated transition-colors text-text-secondary"
          aria-label="Next month"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-medium text-text-muted py-1.5"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`blank-${idx}`} />;
          }

          const ds = toDateStr(viewYear, viewMonth, day);
          const isToday = ds === today;
          const isSelected = ds === selected;
          const past = isPast(day);

          return (
            <button
              key={ds}
              disabled={past}
              onClick={() => onSelect(ds)}
              className={`
                relative h-10 w-full rounded-lg text-sm font-medium transition-colors
                ${past ? "text-text-muted/40 cursor-not-allowed" : "hover:bg-bg-elevated text-foreground cursor-pointer"}
                ${isToday && !isSelected ? "ring-1 ring-inset ring-border" : ""}
                ${isSelected ? "text-white" : ""}
              `}
              style={isSelected ? { backgroundColor: accentColor } : undefined}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Time Slot Picker                                                  */
/* ------------------------------------------------------------------ */

function TimeSlotPicker({
  slug,
  date,
  selected,
  onSelect,
  accentColor,
}: {
  slug: string;
  date: string;
  selected: string;
  onSelect: (t: string) => void;
  accentColor: string;
}) {
  const { data: slots, isLoading } = useAvailableSlots(slug, date);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      </div>
    );
  }

  if (!slots || slots.length === 0) {
    return (
      <p className="text-sm text-text-muted text-center py-8">
        No available times for this date.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[320px] overflow-y-auto pr-1">
      {slots.map((slot) => {
        const isActive = slot === selected;
        return (
          <button
            key={slot}
            onClick={() => onSelect(slot)}
            className={`
              rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors
              ${isActive ? "border-transparent text-white" : "border-border text-foreground hover:bg-bg-elevated"}
            `}
            style={isActive ? { backgroundColor: accentColor } : undefined}
          >
            {formatTime(slot)}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Booking Form                                                      */
/* ------------------------------------------------------------------ */

function BookingForm({
  slug,
  date,
  time,
  accentColor,
  onSuccess,
  onBack,
}: {
  slug: string;
  date: string;
  time: string;
  accentColor: string;
  onSuccess: (appt: { start_at: string; name: string }) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const bookMutation = useBookAppointment();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Build the start_at: combine date + time
    const startAt = time.includes("T") ? time : `${date}T${time}`;

    bookMutation.mutate(
      { slug, start_at: startAt, name, email, notes: notes || undefined },
      {
        onSuccess: () => onSuccess({ start_at: startAt, name }),
      }
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground transition-colors mb-2"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Change time
      </button>

      <div className="rounded-lg border border-border bg-bg-elevated px-4 py-3 text-sm text-text-secondary">
        <span className="font-medium text-foreground">{formatDateLong(date)}</span>
        {" at "}
        <span className="font-medium text-foreground">{formatTime(time)}</span>
      </div>

      {/* Name */}
      <div>
        <label
          htmlFor="booking-name"
          className="block text-sm font-medium text-foreground mb-1.5"
        >
          Name
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            id="booking-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            className="w-full rounded-lg border border-border bg-transparent pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="booking-email"
          className="block text-sm font-medium text-foreground mb-1.5"
        >
          Email
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            id="booking-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-border bg-transparent pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label
          htmlFor="booking-notes"
          className="block text-sm font-medium text-foreground mb-1.5"
        >
          Notes{" "}
          <span className="text-text-muted font-normal">(optional)</span>
        </label>
        <div className="relative">
          <FileText className="absolute left-3 top-3 h-4 w-4 text-text-muted" />
          <textarea
            id="booking-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything you'd like us to know..."
            className="w-full rounded-lg border border-border bg-transparent pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow resize-none"
          />
        </div>
      </div>

      {/* Error */}
      {bookMutation.isError && (
        <p className="text-sm text-red-400">
          Something went wrong. Please try again.
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={bookMutation.isPending}
        className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
        style={{ backgroundColor: accentColor }}
      >
        {bookMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Booking...
          </>
        ) : (
          "Confirm Booking"
        )}
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                         */
/* ------------------------------------------------------------------ */

type Step = "date" | "time" | "form" | "done";

export default function BookingPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const { data: eventType, isLoading, error } = usePublicEventType(slug);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [step, setStep] = useState<Step>("date");
  const [confirmedInfo, setConfirmedInfo] = useState<{
    start_at: string;
    name: string;
  } | null>(null);

  const accent = eventType?.color || "#6366f1";

  /* ---- Loading --------------------------------------------------- */
  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  /* ---- Not found ------------------------------------------------- */
  if (error || !eventType) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-elevated border border-border">
          <span className="text-2xl text-text-muted">404</span>
        </div>
        <h1 className="text-xl font-semibold text-foreground">
          Booking not found
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          This booking link doesn&apos;t exist or is no longer available.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Home
        </Link>
      </div>
    );
  }

  /* ---- Confirmation step ----------------------------------------- */
  if (step === "done" && confirmedInfo) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <div
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: `${accent}15` }}
        >
          <CheckCircle2 className="h-8 w-8" style={{ color: accent }} />
        </div>

        <h1 className="text-2xl font-bold text-foreground">
          Booking Confirmed
        </h1>
        <p className="mt-2 text-text-secondary">
          You&apos;re all set! A confirmation has been sent to your email.
        </p>

        <div className="mt-8 rounded-xl border border-border bg-bg-elevated p-6 text-left space-y-3">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-text-muted mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {formatDateLong(selectedDate)}
              </p>
              <p className="text-sm text-text-secondary">
                {formatTime(selectedTime)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-text-muted mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {eventType.name}
              </p>
              <p className="text-sm text-text-secondary">
                {eventType.duration_minutes} minutes
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-text-muted mt-0.5 shrink-0" />
            <p className="text-sm font-medium text-foreground">
              {confirmedInfo.name}
            </p>
          </div>
        </div>

        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-elevated transition-colors"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  /* ---- Main booking flow ----------------------------------------- */
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="grid gap-8 lg:grid-cols-[280px,1fr]">
        {/* ---------- Sidebar: event info ---------- */}
        <div className="lg:border-r lg:border-border lg:pr-8">
          <div
            className="mb-4 h-1.5 w-12 rounded-full"
            style={{ backgroundColor: accent }}
          />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {eventType.name}
          </h1>
          {eventType.description && (
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">
              {eventType.description}
            </p>
          )}

          <div className="mt-5 space-y-2.5">
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Clock className="h-4 w-4" />
              {eventType.duration_minutes} minutes
            </div>
            {eventType.calendar && (
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <Calendar className="h-4 w-4" />
                {eventType.calendar.name}
              </div>
            )}
            {eventType.price > 0 && (
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <span className="text-xs font-semibold rounded-full px-2 py-0.5" style={{ backgroundColor: `${accent}15`, color: accent }}>
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(eventType.price / 100)}
                </span>
              </div>
            )}
          </div>

          {/* Step indicator */}
          <div className="mt-8 flex items-center gap-2 text-xs text-text-muted">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-white text-xs font-semibold ${step === "date" ? "" : "opacity-50"}`}
              style={{ backgroundColor: accent }}
            >
              1
            </span>
            <span className={step === "date" ? "text-foreground font-medium" : ""}>
              Date
            </span>
            <span className="text-border">-</span>
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-white text-xs font-semibold ${step === "time" ? "" : "opacity-50"}`}
              style={{ backgroundColor: accent }}
            >
              2
            </span>
            <span className={step === "time" ? "text-foreground font-medium" : ""}>
              Time
            </span>
            <span className="text-border">-</span>
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-white text-xs font-semibold ${step === "form" ? "" : "opacity-50"}`}
              style={{ backgroundColor: accent }}
            >
              3
            </span>
            <span className={step === "form" ? "text-foreground font-medium" : ""}>
              Confirm
            </span>
          </div>
        </div>

        {/* ---------- Main area ---------- */}
        <div className="min-w-0">
          {/* Step 1: Date */}
          {step === "date" && (
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Select a Date
              </h2>
              <div className="max-w-[320px]">
                <MiniCalendar
                  selected={selectedDate}
                  onSelect={(d) => {
                    setSelectedDate(d);
                    setSelectedTime("");
                    setStep("time");
                  }}
                  accentColor={accent}
                />
              </div>
            </div>
          )}

          {/* Step 2: Time */}
          {step === "time" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Pick a Time
                </h2>
                <button
                  onClick={() => {
                    setStep("date");
                    setSelectedTime("");
                  }}
                  className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Change date
                </button>
              </div>
              <p className="text-sm text-text-muted mb-4">
                {formatDateLong(selectedDate)}
              </p>
              <TimeSlotPicker
                slug={slug}
                date={selectedDate}
                selected={selectedTime}
                onSelect={(t) => {
                  setSelectedTime(t);
                  setStep("form");
                }}
                accentColor={accent}
              />
            </div>
          )}

          {/* Step 3: Form */}
          {step === "form" && (
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Your Details
              </h2>
              <BookingForm
                slug={slug}
                date={selectedDate}
                time={selectedTime}
                accentColor={accent}
                onBack={() => {
                  setSelectedTime("");
                  setStep("time");
                }}
                onSuccess={(info) => {
                  setConfirmedInfo(info);
                  setStep("done");
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
