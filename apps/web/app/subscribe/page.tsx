"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Mail, ArrowLeft, Shield } from "lucide-react";
import { api } from "@/lib/api";
import { useTheme } from "@/hooks/use-website";
import { SubscribeForm } from "@/components/subscribe-form";

function SubscribeContent() {
  const searchParams = useSearchParams();
  const listId = Number(searchParams.get("list")) || 0;
  const source = searchParams.get("source") || "link";
  const { data: theme } = useTheme();

  const { data: list, isLoading, error } = useQuery({
    queryKey: ["public-email-list", listId],
    queryFn: async () => {
      const { data } = await api.get(`/api/p/email/lists/${listId}`);
      return data.data as { id: number; name: string; description: string };
    },
    enabled: listId > 0,
  });

  const siteName = theme?.site_name || "Newsletter";

  if (!listId) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)]">
            <Mail className="h-7 w-7 text-[var(--text-muted)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Subscribe</h1>
          <p className="mt-3 text-[var(--text-secondary)]">No list specified. Please use a valid subscribe link.</p>
          <Link href="/" className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  if (error || !list) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)]">
            <Mail className="h-7 w-7 text-[var(--text-muted)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">List not found</h1>
          <p className="mt-3 text-[var(--text-secondary)]">This subscribe link may be invalid or expired.</p>
          <Link href="/" className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[40%] left-1/2 -translate-x-1/2 h-[80%] w-[80%] rounded-full bg-[var(--accent)] opacity-[0.03] blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-8 shadow-xl shadow-black/5 dark:shadow-black/20">
          {/* Header */}
          <div className="text-center mb-8">
            {theme?.logo_url ? (
              <img src={theme.logo_url} alt={siteName} className="mx-auto mb-5 h-10 object-contain" />
            ) : (
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)] shadow-lg shadow-[var(--accent)]/20">
                <Mail className="h-6 w-6 text-white" />
              </div>
            )}
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {list.name}
            </h1>
            {list.description && (
              <p className="mt-2 text-[var(--text-secondary)] leading-relaxed">
                {list.description}
              </p>
            )}
          </div>

          {/* Form */}
          <SubscribeForm listId={listId} source={source} />

          {/* Privacy note */}
          <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Shield className="h-3 w-3" />
            <span>We respect your privacy. Unsubscribe anytime.</span>
          </div>
        </div>

        {/* Footer link */}
        <div className="mt-6 text-center">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
            <ArrowLeft className="h-3 w-3" />
            {siteName}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    }>
      <SubscribeContent />
    </Suspense>
  );
}
