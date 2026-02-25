"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Course } from "@repo/shared/types";

interface PaginatedMeta {
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

interface CourseListParams {
  page?: number;
  pageSize?: number;
}

export function usePublicCourses(params: CourseListParams = {}) {
  const { page = 1, pageSize = 12 } = params;
  return useQuery({
    queryKey: ["public-courses", { page, pageSize }],
    queryFn: async () => {
      const sp = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      const { data } = await api.get(`/api/courses?${sp}`);
      return {
        courses: (data.data || []) as Course[],
        meta: data.meta as PaginatedMeta | undefined,
      };
    },
  });
}

export function usePublicCourse(slug: string) {
  return useQuery({
    queryKey: ["public-courses", slug],
    queryFn: async () => {
      const { data } = await api.get(`/api/courses/${slug}`);
      return data.data as Course;
    },
    enabled: !!slug,
  });
}
