"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface Blog {
  id: number;
  title: string;
  slug: string;
  content: string;
  image: string;
  excerpt: string;
  published: boolean;
  published_at: string | null;
  created_at: string;
}

interface BlogMeta {
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export function usePublicBlogs(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["public-blogs", page, pageSize],
    queryFn: async () => {
      const { data } = await api.get(
        `/api/blogs?page=${page}&page_size=${pageSize}`
      );
      return {
        blogs: (data.data || []) as Blog[],
        meta: data.meta as BlogMeta | undefined,
      };
    },
  });
}

export function usePublicBlog(slug: string) {
  return useQuery({
    queryKey: ["public-blog", slug],
    queryFn: async () => {
      const { data } = await api.get(`/api/blogs/${slug}`);
      return data.data as Blog;
    },
    enabled: !!slug,
  });
}
