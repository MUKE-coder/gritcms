"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { usePublicPosts, usePublicCategories } from "@/hooks/use-website";

export default function BlogListPage() {
  const [page, setPage] = useState(1);
  const [activeCategory, setActiveCategory] = useState("");
  const { data, isLoading } = usePublicPosts({ page, pageSize: 9, category: activeCategory || undefined });
  const { data: categories } = usePublicCategories();
  const posts = data?.posts || [];
  const meta = data?.meta;

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight">Blog</h1>
        <p className="mt-2 text-text-secondary">
          Insights, tutorials, and updates from the team.
        </p>
      </div>

      {/* Category filter */}
      {categories && categories.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => { setActiveCategory(""); setPage(1); }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              !activeCategory ? "bg-accent text-white" : "bg-bg-secondary text-text-secondary border border-border hover:bg-bg-hover"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.slug); setPage(1); }}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeCategory === cat.slug ? "bg-accent text-white" : "bg-bg-secondary text-text-secondary border border-border hover:bg-bg-hover"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Blog grid */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-bg-elevated overflow-hidden animate-pulse">
              <div className="h-52 bg-bg-hover" />
              <div className="p-5 space-y-3">
                <div className="h-3 bg-bg-hover rounded w-1/3" />
                <div className="h-5 bg-bg-hover rounded w-3/4" />
                <div className="h-3 bg-bg-hover rounded w-full" />
                <div className="h-3 bg-bg-hover rounded w-2/3" />
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
                    <img
                      src={post.featured_image}
                      alt={post.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-accent/10 to-accent/5">
                      <span className="text-5xl font-bold text-accent/20">
                        {post.title.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-3 text-xs text-text-muted mb-2.5">
                    <span>
                      {new Date(post.published_at || post.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {post.reading_time > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {post.reading_time} min read
                      </span>
                    )}
                  </div>
                  {post.categories && post.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {post.categories.map((cat) => (
                        <span key={cat.id} className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                          {cat.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <h2 className="font-semibold text-foreground group-hover:text-accent transition-colors line-clamp-2 text-lg leading-snug">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="mt-2.5 text-sm text-text-secondary line-clamp-3 leading-relaxed">
                      {post.excerpt}
                    </p>
                  )}
                  <span className="mt-4 inline-block text-xs font-medium text-accent group-hover:text-accent-hover transition-colors">
                    Read more &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {meta && meta.pages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <div className="flex items-center gap-1 px-3">
                {Array.from({ length: meta.pages }).map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setPage(i + 1)}
                    className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                      page === i + 1
                        ? "bg-accent text-white"
                        : "text-text-secondary hover:bg-bg-hover hover:text-foreground"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
                disabled={page >= meta.pages}
                className="flex items-center gap-1 rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-elevated border border-border">
            <span className="text-2xl text-text-muted">&#9998;</span>
          </div>
          <h3 className="text-lg font-semibold text-foreground">No posts yet</h3>
          <p className="mt-1 text-sm text-text-muted">
            {activeCategory
              ? "No posts in this category yet."
              : "Blog posts will appear here once published from the admin panel."}
          </p>
        </div>
      )}
    </div>
  );
}
