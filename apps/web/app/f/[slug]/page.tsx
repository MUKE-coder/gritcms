"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import { Loader2, ArrowRight, Layers } from "lucide-react";
import { usePublicFunnel } from "@/hooks/use-funnels";

const stepTypeLabels: Record<string, string> = {
  landing: "Landing Page",
  sales: "Sales Page",
  checkout: "Checkout",
  upsell: "Special Offer",
  downsell: "Offer",
  thankyou: "Confirmation",
};

export default function FunnelPage() {
  const params = useParams();
  const router = useRouter();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const { data: funnel, isLoading, error } = usePublicFunnel(slug);

  // Auto-redirect to first step if funnel has steps
  useEffect(() => {
    if (funnel?.steps && funnel.steps.length > 0) {
      const sorted = [...funnel.steps].sort(
        (a, b) => a.sort_order - b.sort_order
      );
      router.replace(`/f/${slug}/${sorted[0].slug}`);
    }
  }, [funnel, slug, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
      </div>
    );
  }

  if (error || !funnel) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-elevated border border-border">
          <span className="text-2xl text-text-muted">404</span>
        </div>
        <h1 className="text-xl font-semibold text-foreground">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          The page you&apos;re looking for doesn&apos;t exist or is no longer
          available.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        >
          Go Home
        </Link>
      </div>
    );
  }

  // If no steps, show funnel info
  return (
    <div className="mx-auto max-w-2xl px-6 py-24">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
          <Layers className="h-7 w-7 text-accent" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          {funnel.name}
        </h1>
        {funnel.description && (
          <p className="mt-4 text-lg text-text-secondary leading-relaxed max-w-lg mx-auto">
            {funnel.description}
          </p>
        )}
      </div>

      {/* Steps list */}
      {funnel.steps && funnel.steps.length > 0 && (
        <div className="mt-12 space-y-3">
          {[...funnel.steps]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((step, index) => (
              <Link
                key={step.id}
                href={`/f/${slug}/${step.slug}`}
                className="flex items-center gap-4 rounded-xl border border-border bg-bg-elevated p-4 hover:border-accent/40 transition-colors group"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-sm font-semibold text-accent">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {step.name}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {stepTypeLabels[step.type] || step.type}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-text-muted group-hover:text-accent transition-colors shrink-0" />
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}
