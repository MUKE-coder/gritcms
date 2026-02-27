"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Mail } from "lucide-react";
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
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-bg-elevated border border-border">
          <Mail className="h-7 w-7 text-text-muted" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Subscribe</h1>
        <p className="mt-2 text-text-secondary">No list specified. Please use a valid subscribe link.</p>
        <Link href="/" className="mt-6 inline-block text-sm text-accent hover:text-accent-hover transition-colors">
          &larr; Back to home
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (error || !list) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-bg-elevated border border-border">
          <Mail className="h-7 w-7 text-text-muted" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">List not found</h1>
        <p className="mt-2 text-text-secondary">This subscribe link may be invalid or expired.</p>
        <Link href="/" className="mt-6 inline-block text-sm text-accent hover:text-accent-hover transition-colors">
          &larr; Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-24">
      <div className="text-center mb-8">
        {theme?.logo_url ? (
          <img src={theme.logo_url} alt={siteName} className="mx-auto mb-4 h-10 object-contain" />
        ) : (
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 border border-accent/20">
            <Mail className="h-7 w-7 text-accent" />
          </div>
        )}
        <h1 className="text-2xl font-bold text-foreground">{list.name}</h1>
        {list.description && (
          <p className="mt-2 text-text-secondary">{list.description}</p>
        )}
      </div>

      <SubscribeForm listId={listId} source={source} />

      <p className="mt-6 text-center text-xs text-text-muted">
        You can unsubscribe at any time. We respect your privacy.
      </p>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    }>
      <SubscribeContent />
    </Suspense>
  );
}
