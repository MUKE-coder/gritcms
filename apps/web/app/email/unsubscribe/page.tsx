"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("token");
  const emailParam = searchParams.get("email");
  const listIdParam = searchParams.get("list_id");

  const [email, setEmail] = useState(emailParam || "");
  const [listId, setListId] = useState(listIdParam || "");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const body: Record<string, unknown> = {};
      if (tokenParam) {
        body.token = tokenParam;
      } else {
        body.email = email.trim();
        body.list_id = Number(listId);
      }

      const { data } = await api.post("/api/email/unsubscribe", body);
      setStatus("success");
      setMessage(data.message || "You have been unsubscribed.");
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again or contact support.");
    }
  };

  // If token is provided, auto-submit
  if (tokenParam && status === "idle") {
    handleUnsubscribe(new Event("submit") as unknown as React.FormEvent);
  }

  if (status === "success") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
            <svg className="h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text-secondary">Unsubscribed</h1>
          <p className="text-text-muted">{message}</p>
          <p className="text-sm text-text-muted">You will no longer receive emails from this list.</p>
          <Link
            href="/"
            className="inline-block mt-4 rounded-lg border border-border px-6 py-2.5 text-sm font-medium text-text-secondary hover:bg-background/50 transition-colors"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-secondary">Unsubscribe</h1>
          <p className="mt-2 text-text-muted">
            {status === "loading" ? "Processing..." : "Enter your email to unsubscribe from our mailing list."}
          </p>
        </div>

        {!tokenParam && (
          <form onSubmit={handleUnsubscribe} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm text-text-secondary placeholder:text-text-muted focus:border-accent focus:outline-none"
              />
            </div>
            {!listIdParam && (
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">List ID</label>
                <input
                  type="number"
                  required
                  value={listId}
                  onChange={(e) => setListId(e.target.value)}
                  placeholder="List ID"
                  className="w-full rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm text-text-secondary placeholder:text-text-muted focus:border-accent focus:outline-none"
                />
              </div>
            )}
            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {status === "loading" ? "Processing..." : "Unsubscribe"}
            </button>
            {status === "error" && (
              <p className="text-sm text-red-400 text-center">{message}</p>
            )}
          </form>
        )}

        {status === "loading" && (
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-accent" />
          </div>
        )}
      </div>
    </div>
  );
}
