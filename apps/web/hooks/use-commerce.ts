"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Product } from "@repo/shared/types";

interface PaginatedMeta {
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export function usePublicProducts(params: { page?: number; pageSize?: number } = {}) {
  const { page = 1, pageSize = 12 } = params;
  return useQuery({
    queryKey: ["public-products", { page, pageSize }],
    queryFn: async () => {
      const sp = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      const { data } = await api.get(`/api/products?${sp}`);
      return {
        products: (data.data || []) as Product[],
        meta: data.meta as PaginatedMeta | undefined,
      };
    },
  });
}

export function usePublicProduct(slug: string) {
  return useQuery({
    queryKey: ["public-products", slug],
    queryFn: async () => {
      const { data } = await api.get(`/api/products/${slug}`);
      return data.data as Product;
    },
    enabled: !!slug,
  });
}
