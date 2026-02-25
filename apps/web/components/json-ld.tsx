import type { Post, Page } from "@repo/shared/types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export function PostJsonLd({ post }: { post: Post }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt || post.meta_description,
    image: post.featured_image || post.og_image || undefined,
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at,
    url: `${SITE_URL}/blog/${post.slug}`,
    author: post.author
      ? {
          "@type": "Person",
          name: `${post.author.first_name} ${post.author.last_name}`.trim(),
        }
      : undefined,
    publisher: {
      "@type": "Organization",
      name: "gritcms",
    },
    wordCount: post.reading_time ? post.reading_time * 200 : undefined,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function PageJsonLd({ page }: { page: Page }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.meta_title || page.title,
    description: page.meta_description || page.excerpt,
    url: `${SITE_URL}/${page.slug}`,
    datePublished: page.published_at || page.created_at,
    dateModified: page.updated_at,
    author: page.author
      ? {
          "@type": "Person",
          name: `${page.author.first_name} ${page.author.last_name}`.trim(),
        }
      : undefined,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
