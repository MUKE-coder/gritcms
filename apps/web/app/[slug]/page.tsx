"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { usePublicPage } from "@/hooks/use-website";
import { ContentBlockList } from "@/components/content-blocks";
import { PageJsonLd } from "@/components/json-ld";

export default function DynamicPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const { data: page, isLoading, error } = usePublicPage(slug);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 animate-pulse">
        <div className="h-10 bg-bg-hover rounded w-2/3 mb-6" />
        <div className="h-4 bg-bg-hover rounded w-full mb-3" />
        <div className="h-4 bg-bg-hover rounded w-full mb-3" />
        <div className="h-4 bg-bg-hover rounded w-5/6 mb-3" />
        <div className="h-4 bg-bg-hover rounded w-4/6 mb-8" />
        <div className="aspect-[2/1] bg-bg-hover rounded-xl mb-8" />
        <div className="h-4 bg-bg-hover rounded w-full mb-3" />
        <div className="h-4 bg-bg-hover rounded w-full mb-3" />
        <div className="h-4 bg-bg-hover rounded w-3/4" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-elevated border border-border">
          <span className="text-2xl text-text-muted">404</span>
        </div>
        <h1 className="text-xl font-semibold text-foreground">Page not found</h1>
        <p className="mt-2 text-sm text-text-muted">
          The page you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <PageJsonLd page={page} />

      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
          {page.title}
        </h1>
        {page.excerpt && (
          <p className="mt-4 text-lg text-text-secondary leading-relaxed">{page.excerpt}</p>
        )}
      </header>

      {page.content && page.content.length > 0 ? (
        <div className="space-y-6">
          <ContentBlockList blocks={page.content} />
        </div>
      ) : null}
    </div>
  );
}
