"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Space } from "@repo/shared/types";

export function usePublicSpaces() {
  return useQuery({
    queryKey: ["public-spaces"],
    queryFn: async () => {
      const { data } = await api.get("/api/community/spaces");
      return data.data as Space[];
    },
  });
}

export function usePublicSpace(slug: string) {
  return useQuery({
    queryKey: ["public-spaces", slug],
    queryFn: async () => {
      const { data } = await api.get(`/api/community/spaces/${slug}`);
      return data.data as Space;
    },
    enabled: !!slug,
  });
}
