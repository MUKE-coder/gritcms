"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

export default function ConfirmSubscriptionPage() {
  const params = useParams();
  const token = params.token as string;
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    api
      .get(`/api/email/confirm/${token}`)
      .then(({ data }) => {
        setStatus("success");
        setMessage(data.message || "Your subscription has been confirmed!");
      })
      .catch(() => {
        setStatus("error");
        setMessage("This confirmation link is invalid or has already been used.");
      });
  }, [token]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="w-full max-w-md text-center space-y-4">
        {status === "loading" && (
          <>
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-border border-t-accent" />
            <p className="text-text-muted">Confirming your subscription...</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
              <svg className="h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-text-secondary">Subscription Confirmed</h1>
            <p className="text-text-muted">{message}</p>
            <Link
              href="/"
              className="inline-block mt-4 rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
            >
              Go to Homepage
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-text-secondary">Confirmation Failed</h1>
            <p className="text-text-muted">{message}</p>
            <Link
              href="/"
              className="inline-block mt-4 rounded-lg border border-border px-6 py-2.5 text-sm font-medium text-text-secondary hover:bg-background/50 transition-colors"
            >
              Go to Homepage
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
