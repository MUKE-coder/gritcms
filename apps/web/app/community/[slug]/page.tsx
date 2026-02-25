"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MessageCircle,
  Users,
  Hash,
  Heart,
  Pin,
  Loader2,
  HelpCircle,
  Megaphone,
} from "lucide-react";
import { usePublicSpace } from "@/hooks/use-community";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function SpaceDetailPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const { data: space, isLoading, error } = usePublicSpace(slug);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  if (error || !space) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-elevated border border-border">
          <span className="text-2xl text-text-muted">404</span>
        </div>
        <h1 className="text-xl font-semibold text-foreground">Space not found</h1>
        <p className="mt-2 text-sm text-text-muted">
          This community space doesn&apos;t exist or is private.
        </p>
        <Link
          href="/community"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Community
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      {/* Back */}
      <Link
        href="/community"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        All spaces
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-lg"
          style={{ backgroundColor: `${space.color}20`, color: space.color }}
        >
          <Hash className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{space.name}</h1>
          {space.description && (
            <p className="mt-2 text-text-secondary">{space.description}</p>
          )}
          <div className="mt-3 flex items-center gap-4 text-sm text-text-muted">
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {space.member_count ?? 0} members
            </span>
            <span className="flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4" />
              {space.thread_count ?? 0} threads
            </span>
          </div>
        </div>
      </div>

      {/* Placeholder for threads */}
      <div className="rounded-xl border border-border bg-bg-elevated p-8 text-center">
        <MessageCircle className="h-10 w-10 text-text-muted mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-foreground">
          Join the discussion
        </h3>
        <p className="mt-2 text-sm text-text-muted max-w-md mx-auto">
          Sign in to view threads, post discussions, ask questions, and engage with the community.
        </p>
      </div>

      {/* Bottom nav */}
      <div className="mt-12 pt-8 border-t border-border/50">
        <Link
          href="/community"
          className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover transition-colors font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          All spaces
        </Link>
      </div>
    </div>
  );
}
