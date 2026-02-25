"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { usePost, useUpdatePost, useCreatePost, usePostCategories, usePostTags } from "@/hooks/use-website";
import { ChevronLeft, Loader2, X } from "@/lib/icons";

export default function PostEditorPage() {
  const router = useRouter();
  const params = useParams();
  const isNew = params.id === "new";
  const postId = isNew ? 0 : Number(params.id);

  const { data: existingPost, isLoading } = usePost(postId);
  const { mutate: updatePost, isPending: isUpdating } = useUpdatePost();
  const { mutate: createPost, isPending: isCreating } = useCreatePost();
  const { data: categories } = usePostCategories();
  const { data: tags } = usePostTags();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");
  const [status, setStatus] = useState("draft");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [ogImage, setOGImage] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  useEffect(() => {
    if (existingPost) {
      setTitle(existingPost.title);
      setSlug(existingPost.slug);
      setExcerpt(existingPost.excerpt || "");
      setFeaturedImage(existingPost.featured_image || "");
      setStatus(existingPost.status);
      setMetaTitle(existingPost.meta_title || "");
      setMetaDescription(existingPost.meta_description || "");
      setOGImage(existingPost.og_image || "");
      setSelectedCategoryIds(existingPost.categories?.map((c) => c.id) ?? []);
      setSelectedTagIds(existingPost.tags?.map((t) => t.id) ?? []);
    }
  }, [existingPost]);

  const handleSave = (publishStatus?: string) => {
    const body = {
      title,
      slug,
      excerpt,
      featured_image: featuredImage,
      status: publishStatus || status,
      meta_title: metaTitle,
      meta_description: metaDescription,
      og_image: ogImage,
      category_ids: selectedCategoryIds,
      tag_ids: selectedTagIds,
    };

    if (isNew) {
      createPost(body, {
        onSuccess: (post) => router.push(`/website/posts/${post.id}`),
      });
    } else {
      updatePost({ id: postId, ...body });
    }
    if (publishStatus) setStatus(publishStatus);
  };

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  const isSaving = isUpdating || isCreating;

  const toggleCategory = (id: number) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const toggleTag = (id: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/website/posts")} className="rounded-lg p-2 text-text-secondary hover:bg-bg-hover transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">{isNew ? "New Post" : "Edit Post"}</h1>
            {!isNew && <p className="text-sm text-text-muted">/blog/{slug}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleSave()} disabled={isSaving || !title} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-bg-hover disabled:opacity-50 transition-colors">
            {isSaving ? "Saving..." : "Save Draft"}
          </button>
          <button onClick={() => handleSave("published")} disabled={isSaving || !title} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors">
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
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title" className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Slug</label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-text-muted">/blog/</span>
                <input type="text" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="post-slug" className="flex-1 rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Excerpt</label>
              <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Brief summary of the post..." rows={3} className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none resize-none" />
            </div>

            {/* Content editor placeholder */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Content</label>
              <div className="rounded-lg border border-dashed border-border bg-bg-tertiary p-8 text-center">
                <p className="text-text-muted text-sm">Block editor will be integrated here.</p>
                <p className="text-text-muted text-xs mt-1">For now, content is managed via the API as JSON blocks.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status */}
          <div className="rounded-xl border border-border bg-bg-secondary p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Status</h3>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-foreground focus:outline-none">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Featured Image */}
          <div className="rounded-xl border border-border bg-bg-secondary p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Featured Image</h3>
            <input type="text" value={featuredImage} onChange={(e) => setFeaturedImage(e.target.value)} placeholder="Image URL" className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-1.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none" />
            {featuredImage && (
              <div className="relative rounded-lg overflow-hidden">
                <img src={featuredImage} alt="" className="w-full h-32 object-cover" />
                <button onClick={() => setFeaturedImage("")} className="absolute top-1 right-1 rounded bg-black/50 p-1 text-white hover:bg-black/70">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {/* Categories */}
          <div className="rounded-xl border border-border bg-bg-secondary p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Categories</h3>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {categories?.map((cat) => (
                <label key={cat.id} className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer hover:text-foreground">
                  <input
                    type="checkbox"
                    checked={selectedCategoryIds.includes(cat.id)}
                    onChange={() => toggleCategory(cat.id)}
                    className="h-3.5 w-3.5 rounded border-border accent-accent"
                  />
                  {cat.name}
                </label>
              ))}
              {(!categories || categories.length === 0) && (
                <p className="text-xs text-text-muted">No categories yet</p>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="rounded-xl border border-border bg-bg-secondary p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {tags?.map((tag) => {
                const selected = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                      selected ? "bg-accent text-white" : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
                    }`}
                  >
                    {tag.name}
                  </button>
                );
              })}
              {(!tags || tags.length === 0) && (
                <p className="text-xs text-text-muted">No tags yet</p>
              )}
            </div>
          </div>

          {/* SEO */}
          <div className="rounded-xl border border-border bg-bg-secondary p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">SEO</h3>
            <div>
              <label className="block text-xs text-text-muted mb-1">Meta Title</label>
              <input type="text" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder="SEO title" className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-1.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Meta Description</label>
              <textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} placeholder="SEO description" rows={2} className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-1.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none resize-none" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
