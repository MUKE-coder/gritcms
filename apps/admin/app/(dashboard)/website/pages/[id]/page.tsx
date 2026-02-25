"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { usePage, useUpdatePage, useCreatePage } from "@/hooks/use-website";
import { ChevronLeft, Loader2 } from "@/lib/icons";
import type { ContentBlock } from "@repo/shared/types";

export default function PageEditorPage() {
  const router = useRouter();
  const params = useParams();
  const isNew = params.id === "new";
  const pageId = isNew ? 0 : Number(params.id);

  const { data: existingPage, isLoading } = usePage(pageId);
  const { mutate: updatePage, isPending: isUpdating } = useUpdatePage();
  const { mutate: createPage, isPending: isCreating } = useCreatePage();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");
  const [template, setTemplate] = useState("default");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [ogImage, setOGImage] = useState("");
  const [content, setContent] = useState<ContentBlock[]>([]);

  useEffect(() => {
    if (existingPage) {
      setTitle(existingPage.title);
      setSlug(existingPage.slug);
      setExcerpt(existingPage.excerpt || "");
      setStatus(existingPage.status);
      setTemplate(existingPage.template || "default");
      setMetaTitle(existingPage.meta_title || "");
      setMetaDescription(existingPage.meta_description || "");
      setOGImage(existingPage.og_image || "");
      setContent(existingPage.content ?? []);
    }
  }, [existingPage]);

  const handleSave = () => {
    const body = {
      title,
      slug,
      excerpt,
      status,
      template,
      meta_title: metaTitle,
      meta_description: metaDescription,
      og_image: ogImage,
      content: content as unknown as ContentBlock[],
    };

    if (isNew) {
      createPage(body, {
        onSuccess: (page) => router.push(`/website/pages/${page.id}`),
      });
    } else {
      updatePage({ id: pageId, ...body });
    }
  };

  const handlePublish = () => {
    const body = {
      title,
      slug,
      excerpt,
      status: "published" as const,
      template,
      meta_title: metaTitle,
      meta_description: metaDescription,
      og_image: ogImage,
      content: content as unknown as ContentBlock[],
    };

    if (isNew) {
      createPage(body, {
        onSuccess: (page) => router.push(`/website/pages/${page.id}`),
      });
    } else {
      updatePage({ id: pageId, ...body });
    }
    setStatus("published");
  };

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  const isSaving = isUpdating || isCreating;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/website/pages")}
            className="rounded-lg p-2 text-text-secondary hover:bg-bg-hover transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {isNew ? "New Page" : "Edit Page"}
            </h1>
            {!isNew && (
              <p className="text-sm text-text-muted">/{slug}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving || !title}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-bg-hover disabled:opacity-50 transition-colors"
          >
            {isSaving ? "Saving..." : "Save Draft"}
          </button>
          <button
            onClick={handlePublish}
            disabled={isSaving || !title}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            Publish
          </button>
        </div>
      </div>

      {/* Editor Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main editor */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-border bg-bg-secondary p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Page title"
                className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Slug</label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-text-muted">/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                  placeholder="page-slug"
                  className="flex-1 rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Excerpt</label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Brief description of the page..."
                rows={3}
                className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none resize-none"
              />
            </div>

            {/* Content editor placeholder */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Content</label>
              <div className="rounded-lg border border-dashed border-border bg-bg-tertiary p-8 text-center">
                <p className="text-text-muted text-sm">
                  Block editor will be integrated here.
                </p>
                <p className="text-text-muted text-xs mt-1">
                  For now, content is managed via the API as JSON blocks.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status */}
          <div className="rounded-xl border border-border bg-bg-secondary p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Status</h3>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "draft" | "published" | "archived")}
              className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-foreground focus:outline-none"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Template */}
          <div className="rounded-xl border border-border bg-bg-secondary p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Template</h3>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-foreground focus:outline-none"
            >
              <option value="default">Default</option>
              <option value="full-width">Full Width</option>
              <option value="landing">Landing Page</option>
              <option value="sidebar">With Sidebar</option>
            </select>
          </div>

          {/* SEO */}
          <div className="rounded-xl border border-border bg-bg-secondary p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">SEO</h3>
            <div>
              <label className="block text-xs text-text-muted mb-1">Meta Title</label>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="Page title for search engines"
                className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-1.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Meta Description</label>
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Page description for search engines"
                rows={2}
                className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-1.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">OG Image URL</label>
              <input
                type="text"
                value={ogImage}
                onChange={(e) => setOGImage(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-1.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
