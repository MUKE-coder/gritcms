"use client";

import Link from "next/link";
import { MessageCircle, Users, Hash, Loader2 } from "lucide-react";
import { usePublicSpaces } from "@/hooks/use-community";

export default function CommunityPage() {
  const { data: spaces, isLoading } = usePublicSpaces();

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Community</h1>
        <p className="mt-3 text-lg text-text-secondary max-w-2xl mx-auto">
          Join the conversation. Connect with fellow members, ask questions, and share ideas.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : spaces && spaces.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {spaces.map((space) => (
            <Link
              key={space.id}
              href={`/community/${space.slug}`}
              className="group rounded-xl border border-border bg-bg-elevated p-6 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg"
                  style={{ backgroundColor: `${space.color}20`, color: space.color }}
                >
                  <Hash className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-lg text-foreground group-hover:text-accent transition-colors">
                    {space.name}
                  </h2>
                  {space.description && (
                    <p className="mt-1 text-sm text-text-secondary line-clamp-2">
                      {space.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-4 text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {space.member_count ?? 0} members
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3.5 w-3.5" />
                      {space.thread_count ?? 0} threads
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-elevated border border-border">
            <MessageCircle className="h-8 w-8 text-text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No community spaces yet</h3>
          <p className="mt-1 text-sm text-text-muted">
            Community spaces will appear here once created.
          </p>
        </div>
      )}
    </div>
  );
}
