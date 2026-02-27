"use client";

import { useState } from "react";
import { api } from "@/lib/api";

interface SubscribeFormProps {
  listId: number;
  source?: string;
  title?: string;
  description?: string;
  buttonText?: string;
  className?: string;
  compact?: boolean;
}

export function SubscribeForm({
  listId,
  source = "website",
  title,
  description,
  buttonText = "Subscribe",
  className = "",
  compact = false,
}: SubscribeFormProps) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "confirm" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    try {
      const { data } = await api.post("/api/email/subscribe", {
        email: email.trim(),
        first_name: firstName.trim(),
        list_id: listId,
        source,
      });
      setStatus(data.confirm_required ? "confirm" : "success");
      setMessage(data.message);
      setEmail("");
      setFirstName("");
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  if (status === "success" || status === "confirm") {
    return (
      <div className={`text-center ${className}`}>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--success)]/10 ring-4 ring-[var(--success)]/5">
          <svg className="h-7 w-7 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          {status === "confirm" ? "Check your email" : "You're subscribed!"}
        </h3>
        <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">{message}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {title && <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>}
      {description && <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>}

      <form onSubmit={handleSubmit} className={`${title || description ? "mt-4" : ""} space-y-3`}>
        {!compact && (
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 ml-1">
              First name
            </label>
            <input
              type="text"
              placeholder="John"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 focus:outline-none transition-all"
            />
          </div>
        )}
        <div className={compact ? "flex gap-2" : ""}>
          {!compact && (
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 ml-1">
              Email address <span className="text-[var(--danger)]">*</span>
            </label>
          )}
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={`${compact ? "flex-1" : "w-full"} rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 focus:outline-none transition-all`}
          />
          {compact && (
            <button
              type="submit"
              disabled={status === "loading"}
              className="rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors shadow-md shadow-[var(--accent)]/20"
            >
              {status === "loading" ? "..." : buttonText}
            </button>
          )}
        </div>
        {!compact && (
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-all shadow-md shadow-[var(--accent)]/20 hover:shadow-lg hover:shadow-[var(--accent)]/30 active:scale-[0.98]"
          >
            {status === "loading" ? (
              <span className="inline-flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Subscribing...
              </span>
            ) : buttonText}
          </button>
        )}
        {status === "error" && (
          <p className="text-sm text-[var(--danger)] text-center">{message}</p>
        )}
      </form>
    </div>
  );
}
