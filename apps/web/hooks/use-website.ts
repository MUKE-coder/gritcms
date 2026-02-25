"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Post, Page, PostCategory, PostTag, Menu } from "@repo/shared/types";

interface PaginatedMeta {
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// --- Posts (Public) ---

interface PostListParams {
  page?: number;
  pageSize?: number;
  category?: string;
  tag?: string;
}

export function usePublicPosts(params: PostListParams = {}) {
  const { page = 1, pageSize = 9, category, tag } = params;
  return useQuery({
    queryKey: ["public-posts", { page, pageSize, category, tag }],
    queryFn: async () => {
      const sp = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (category) sp.set("category", category);
      if (tag) sp.set("tag", tag);
      const { data } = await api.get(`/api/posts?${sp}`);
      return {
        posts: (data.data || []) as Post[],
        meta: data.meta as PaginatedMeta | undefined,
      };
    },
  });
}

export function usePublicPost(slug: string) {
  return useQuery({
    queryKey: ["public-post", slug],
    queryFn: async () => {
      const { data } = await api.get(`/api/posts/${slug}`);
      return data.data as Post;
    },
    enabled: !!slug,
  });
}

// --- Pages (Public) ---

export function usePublicPage(slug: string) {
  return useQuery({
    queryKey: ["public-page", slug],
    queryFn: async () => {
      const { data } = await api.get(`/api/pages/${slug}`);
      return data.data as Page;
    },
    enabled: !!slug,
  });
}

// --- Categories ---

export function usePublicCategories() {
  return useQuery({
    queryKey: ["public-categories"],
    queryFn: async () => {
      const { data } = await api.get("/api/post-categories");
      return (data.data || []) as PostCategory[];
    },
  });
}

// --- Tags ---

export function usePublicTags() {
  return useQuery({
    queryKey: ["public-tags"],
    queryFn: async () => {
      const { data } = await api.get("/api/post-tags");
      return (data.data || []) as PostTag[];
    },
  });
}

// --- Menus (Public) ---

export function useMenu(location: string) {
  return useQuery({
    queryKey: ["public-menu", location],
    queryFn: async () => {
      const { data } = await api.get(`/api/menus/location/${location}`);
      return data.data as Menu;
    },
    retry: false,
  });
}

// --- Theme ---

export interface ThemeSettings {
  site_name?: string;
  site_tagline?: string;
  logo_url?: string;
  favicon_url?: string;
  accent_color?: string;
  background_color?: string;
  foreground_color?: string;
  heading_font?: string;
  body_font?: string;
  social_twitter?: string;
  social_github?: string;
  social_linkedin?: string;
  social_youtube?: string;
  footer_text?: string;
}

export function useTheme() {
  return useQuery({
    queryKey: ["public-theme"],
    queryFn: async () => {
      const { data } = await api.get("/api/theme");
      return (data.data || {}) as ThemeSettings;
    },
    staleTime: 5 * 60 * 1000, // cache theme for 5 minutes
  });
}

// --- JSON-LD ---

export function usePostJsonLd(slug: string) {
  return useQuery({
    queryKey: ["post-jsonld", slug],
    queryFn: async () => {
      const { data } = await api.get(`/api/posts/${slug}/jsonld`);
      return data;
    },
    enabled: !!slug,
  });
}
