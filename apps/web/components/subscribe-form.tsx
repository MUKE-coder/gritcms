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
      <div className={`rounded-xl border border-border/50 bg-background/50 p-6 text-center ${className}`}>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
          <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-text-secondary">
          {status === "confirm" ? "Check your email" : "You're subscribed!"}
        </h3>
        <p className="mt-1 text-sm text-text-muted">{message}</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-border/50 bg-background/50 p-6 ${className}`}>
      {title && <h3 className="text-lg font-semibold text-text-secondary">{title}</h3>}
      {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}

      <form onSubmit={handleSubmit} className={`${title || description ? "mt-4" : ""} space-y-3`}>
        {!compact && (
          <input
            type="text"
            placeholder="First name (optional)"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm text-text-secondary placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
        )}
        <div className={compact ? "flex gap-2" : ""}>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={`${compact ? "flex-1" : "w-full"} rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm text-text-secondary placeholder:text-text-muted focus:border-accent focus:outline-none`}
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className={`${compact ? "" : "w-full mt-0"} rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors`}
          >
            {status === "loading" ? "Subscribing..." : buttonText}
          </button>
        </div>
        {status === "error" && (
          <p className="text-sm text-red-400">{message}</p>
        )}
      </form>
    </div>
  );
}
