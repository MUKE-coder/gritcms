"use client";

import Link from "next/link";
import { Clock, CalendarCheck, DollarSign } from "lucide-react";
import { usePublicEventTypes } from "@/hooks/use-booking";

export default function BookingPage() {
  const { data: eventTypes, isLoading } = usePublicEventTypes();

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Book a Session</h1>
        <p className="mt-3 text-lg text-text-secondary max-w-2xl mx-auto">
          Choose a time that works for you and schedule your appointment.
        </p>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-bg-elevated overflow-hidden animate-pulse">
              <div className="p-6 space-y-3">
                <div className="h-3 w-3 rounded-full bg-bg-hover" />
                <div className="h-5 bg-bg-hover rounded w-3/4" />
                <div className="h-3 bg-bg-hover rounded w-full" />
                <div className="h-3 bg-bg-hover rounded w-1/2" />
                <div className="mt-4 h-4 bg-bg-hover rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : eventTypes && eventTypes.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {eventTypes.map((et) => (
            <Link
              key={et.id}
              href={`/book/${et.slug}`}
              className="group rounded-xl border border-border bg-bg-elevated p-6 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300"
            >
              {/* Color dot + name */}
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="mt-1 h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: et.color || "#6366f1" }}
                />
                <h2 className="font-semibold text-lg text-foreground group-hover:text-accent transition-colors leading-snug">
                  {et.name}
                </h2>
              </div>

              {/* Description */}
              {et.description && (
                <p className="text-sm text-text-secondary line-clamp-2 leading-relaxed mb-4">
                  {et.description}
                </p>
              )}

              {/* Meta */}
              <div className="flex items-center gap-4 text-xs text-text-muted">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {et.duration_minutes} min
                </span>
                {et.price > 0 ? (
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(et.price / 100)}
                  </span>
                ) : (
                  <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
                    Free
                  </span>
                )}
              </div>

              <span className="mt-4 inline-block text-xs font-medium text-accent group-hover:text-accent-hover transition-colors">
                Book now &rarr;
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-elevated border border-border">
            <CalendarCheck className="h-8 w-8 text-text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No bookings available</h3>
          <p className="mt-1 text-sm text-text-muted">
            Check back soon for available sessions.
          </p>
        </div>
      )}
    </div>
  );
}
