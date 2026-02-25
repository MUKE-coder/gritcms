"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { usePublicPosts, usePublicCategories } from "@/hooks/use-website";

export default function BlogCategoryPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const [page, setPage] = useState(1);

  const { data, isLoading } = usePublicPosts({ page, pageSize: 9, category: slug });
  const { data: categories } = usePublicCategories();
  const posts = data?.posts || [];
  const meta = data?.meta;

  const category = categories?.find((c) => c.slug === slug);

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      {/* Back link */}
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        All Posts
      </Link>

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight">
          {category?.name || slug}
        </h1>
        {category?.description && (
          <p className="mt-2 text-text-secondary">{category.description}</p>
        )}
      </div>

      {/* Posts grid */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-bg-elevated overflow-hidden animate-pulse">
              <div className="h-52 bg-bg-hover" />
              <div className="p-5 space-y-3">
                <div className="h-3 bg-bg-hover rounded w-1/3" />
                <div className="h-5 bg-bg-hover rounded w-3/4" />
                <div className="h-3 bg-bg-hover rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length > 0 ? (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group rounded-xl border border-border bg-bg-elevated overflow-hidden hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300"
              >
                <div className="h-52 bg-bg-hover overflow-hidden">
                  {post.featured_image ? (
                    <img src={post.featured_image} alt={post.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-accent/10 to-accent/5">
                      <span className="text-5xl font-bold text-accent/20">{post.title.charAt(0)}</span>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-3 text-xs text-text-muted mb-2.5">
                    <span>
                      {new Date(post.published_at || post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    {post.reading_time > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {post.reading_time} min read
                      </span>
                    )}
                  </div>
                  <h2 className="font-semibold text-foreground group-hover:text-accent transition-colors line-clamp-2 text-lg leading-snug">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="mt-2.5 text-sm text-text-secondary line-clamp-3 leading-relaxed">{post.excerpt}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {meta && meta.pages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover transition-colors disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <span className="text-sm text-text-muted px-3">
                Page {meta.page} of {meta.pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
                disabled={page >= meta.pages}
                className="flex items-center gap-1 rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover transition-colors disabled:opacity-40"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20">
          <h3 className="text-lg font-semibold text-foreground">No posts in this category</h3>
          <p className="mt-1 text-sm text-text-muted">Check back later for new content.</p>
          <Link href="/blog" className="mt-4 inline-flex items-center gap-2 text-sm text-accent hover:text-accent-hover font-medium">
            <ArrowLeft className="h-4 w-4" /> Back to Blog
          </Link>
        </div>
      )}
    </div>
  );
}
