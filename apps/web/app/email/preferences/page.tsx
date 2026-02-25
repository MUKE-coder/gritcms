"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

interface ListInfo {
  id: number;
  name: string;
  description: string;
  subscribed: boolean;
}

export default function EmailPreferencesPage() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailParam);
  const [lists, setLists] = useState<ListInfo[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  const loadPreferences = async () => {
    if (!email.trim()) return;
    setStatus("loading");
    try {
      // We fetch all available lists and check subscriptions
      // For now, this uses the public subscribe/unsubscribe endpoints
      setStatus("loaded");
      setMessage("");
    } catch {
      setStatus("error");
      setMessage("Failed to load preferences.");
    }
  };

  useEffect(() => {
    if (emailParam) loadPreferences();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleList = async (listId: number, subscribe: boolean) => {
    setStatus("saving");
    try {
      if (subscribe) {
        await api.post("/api/email/subscribe", {
          email: email.trim(),
          list_id: listId,
          source: "preferences",
        });
      } else {
        await api.post("/api/email/unsubscribe", {
          email: email.trim(),
          list_id: listId,
        });
      }
      setLists((prev) =>
        prev.map((l) => (l.id === listId ? { ...l, subscribed: subscribe } : l))
      );
      setStatus("saved");
      setMessage(subscribe ? "Subscribed!" : "Unsubscribed from list.");
      setTimeout(() => setStatus("loaded"), 2000);
    } catch {
      setStatus("error");
      setMessage("Failed to update preferences.");
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-secondary">Email Preferences</h1>
          <p className="mt-2 text-text-muted">
            Manage which email lists you are subscribed to.
          </p>
        </div>

        {status === "idle" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadPreferences();
            }}
            className="space-y-4"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full rounded-lg border border-border/50 bg-background px-4 py-2.5 text-sm text-text-secondary placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
            >
              Load Preferences
            </button>
          </form>
        )}

        {status === "loading" && (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-accent" />
          </div>
        )}

        {(status === "loaded" || status === "saving" || status === "saved") && (
          <div className="space-y-4">
            <p className="text-sm text-text-muted text-center">
              Managing preferences for <span className="font-medium text-text-secondary">{email}</span>
            </p>

            {lists.length > 0 ? (
              <div className="space-y-3">
                {lists.map((list) => (
                  <div
                    key={list.id}
                    className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 p-4"
                  >
                    <div>
                      <p className="font-medium text-text-secondary">{list.name}</p>
                      {list.description && (
                        <p className="text-xs text-text-muted mt-0.5">{list.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleToggleList(list.id, !list.subscribed)}
                      disabled={status === "saving"}
                      className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                        list.subscribed
                          ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                          : "bg-accent/10 text-accent hover:bg-accent/20"
                      } disabled:opacity-50`}
                    >
                      {list.subscribed ? "Unsubscribe" : "Subscribe"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-text-muted py-4">
                No mailing lists available at this time.
              </p>
            )}

            {(status === "saved" || status === "saving") && message && (
              <p className="text-sm text-accent text-center">{message}</p>
            )}
          </div>
        )}

        {status === "error" && (
          <div className="text-center space-y-3">
            <p className="text-sm text-red-400">{message}</p>
            <button
              onClick={() => setStatus("idle")}
              className="text-sm text-accent hover:text-accent/80"
            >
              Try again
            </button>
          </div>
        )}

        <div className="text-center pt-4">
          <Link href="/" className="text-sm text-text-muted hover:text-text-secondary transition-colors">
            Back to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
