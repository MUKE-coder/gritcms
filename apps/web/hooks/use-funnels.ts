"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Funnel, FunnelStep } from "@repo/shared/types";

export function usePublicFunnel(slug: string) {
  return useQuery({
    queryKey: ["public-funnel", slug],
    queryFn: async () => {
      const { data } = await api.get(`/api/funnels/${slug}`);
      return data.data as Funnel;
    },
    enabled: !!slug,
  });
}

export function usePublicStep(funnelSlug: string, stepSlug: string) {
  return useQuery({
    queryKey: ["public-funnel-step", funnelSlug, stepSlug],
    queryFn: async () => {
      const { data } = await api.get(`/api/funnels/${funnelSlug}/${stepSlug}`);
      return { step: data.data as FunnelStep, funnel: data.funnel as Funnel };
    },
    enabled: !!funnelSlug && !!stepSlug,
  });
}
