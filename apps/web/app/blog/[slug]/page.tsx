"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, User } from "lucide-react";
import { usePublicPost } from "@/hooks/use-website";
import { ContentBlockList } from "@/components/content-blocks";
import { PostJsonLd } from "@/components/json-ld";

export default function BlogDetailPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const { data: post, isLoading, error } = usePublicPost(slug);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 animate-pulse">
        <div className="h-4 bg-bg-hover rounded w-24 mb-8" />
        <div className="h-8 bg-bg-hover rounded w-3/4 mb-4" />
        <div className="h-4 bg-bg-hover rounded w-1/3 mb-12" />
        <div className="aspect-[2/1] bg-bg-hover rounded-xl mb-12" />
        <div className="space-y-4">
          <div className="h-4 bg-bg-hover rounded w-full" />
          <div className="h-4 bg-bg-hover rounded w-full" />
          <div className="h-4 bg-bg-hover rounded w-5/6" />
          <div className="h-4 bg-bg-hover rounded w-full" />
          <div className="h-4 bg-bg-hover rounded w-4/6" />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-elevated border border-border">
          <span className="text-2xl text-text-muted">404</span>
        </div>
        <h1 className="text-xl font-semibold text-foreground">Post not found</h1>
        <p className="mt-2 text-sm text-text-muted">
          The blog post you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Link
          href="/blog"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Blog
        </Link>
      </div>
    );
  }

  const authorName = post.author
    ? `${post.author.first_name} ${post.author.last_name}`.trim()
    : null;

  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <PostJsonLd post={post} />

      {/* Back link */}
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Blog
      </Link>

      {/* Categories */}
      {post.categories && post.categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {post.categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/blog/category/${cat.slug}`}
              className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent hover:bg-accent/20 transition-colors"
            >
              {cat.name}
            </Link>
          ))}
        </div>
      )}

      {/* Title and meta */}
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
          {post.title}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-text-muted">
          {authorName && (
            <span className="flex items-center gap-1.5">
              {post.author?.avatar ? (
                <img src={post.author.avatar} alt={authorName} className="h-5 w-5 rounded-full object-cover" />
              ) : (
                <User className="h-4 w-4" />
              )}
              {authorName}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <time dateTime={post.published_at || post.created_at}>
              {new Date(post.published_at || post.created_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </time>
          </span>
          {post.reading_time > 0 && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {post.reading_time} min read
            </span>
          )}
        </div>
      </header>

      {/* Cover image */}
      {post.featured_image && (
        <div className="mb-12 rounded-xl overflow-hidden border border-border">
          <img
            src={post.featured_image}
            alt={post.title}
            className="w-full h-auto object-cover"
          />
        </div>
      )}

      {/* Content blocks */}
      {post.content && post.content.length > 0 ? (
        <div className="space-y-6">
          <ContentBlockList blocks={post.content} />
        </div>
      ) : post.excerpt ? (
        <div className="text-text-secondary leading-relaxed">
          <p>{post.excerpt}</p>
        </div>
      ) : null}

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="mt-12 pt-6 border-t border-border/50">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-text-muted">Tags:</span>
            {post.tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/blog/tag/${tag.slug}`}
                className="rounded-lg bg-bg-secondary border border-border px-3 py-1 text-xs font-medium text-text-secondary hover:text-foreground hover:border-accent/40 transition-colors"
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <div className="mt-12 pt-8 border-t border-border/50">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover transition-colors font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          All posts
        </Link>
      </div>
    </article>
  );
}
