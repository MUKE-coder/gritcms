"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type {
  Funnel,
  FunnelStep,
  FunnelAnalytics,
} from "@repo/shared/types";

// --- Funnels ---

export function useFunnels(page = 1, search = "", status = "") {
  return useQuery({
    queryKey: ["funnels", { page, search, status }],
    queryFn: async () => {
      const sp = new URLSearchParams({ page: String(page) });
      if (search) sp.set("search", search);
      if (status) sp.set("status", status);
      const { data } = await apiClient.get(`/api/funnels?${sp}`);
      return data as { data: Funnel[]; meta: { total: number; page: number; page_size: number; pages: number } };
    },
  });
}

export function useFunnel(id: number) {
  return useQuery({
    queryKey: ["funnels", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/funnels/${id}`);
      return data.data as Funnel;
    },
    enabled: id > 0,
  });
}

export function useCreateFunnel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<Funnel>) => {
      const { data } = await apiClient.post("/api/funnels", body);
      return data.data as Funnel;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["funnels"] });
      toast.success("Funnel created");
    },
    onError: () => toast.error("Failed to create funnel"),
  });
}

export function useUpdateFunnel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<Funnel> & { id: number }) => {
      const { data } = await apiClient.put(`/api/funnels/${id}`, body);
      return data.data as Funnel;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["funnels"] });
      qc.invalidateQueries({ queryKey: ["funnels", vars.id] });
      toast.success("Funnel updated");
    },
    onError: () => toast.error("Failed to update funnel"),
  });
}

export function useDeleteFunnel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/api/funnels/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["funnels"] });
      toast.success("Funnel deleted");
    },
    onError: () => toast.error("Failed to delete funnel"),
  });
}

export function useFunnelAnalytics(id: number) {
  return useQuery({
    queryKey: ["funnels", id, "analytics"],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/funnels/${id}/analytics`);
      return data.data as FunnelAnalytics;
    },
    enabled: id > 0,
  });
}

// --- Funnel Steps ---

export function useCreateStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ funnelId, ...body }: Partial<FunnelStep> & { funnelId: number }) => {
      const { data } = await apiClient.post(`/api/funnels/${funnelId}/steps`, body);
      return data.data as FunnelStep;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["funnels"] });
      toast.success("Step created");
    },
    onError: () => toast.error("Failed to create step"),
  });
}

export function useUpdateStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ funnelId, stepId, ...body }: Partial<FunnelStep> & { funnelId: number; stepId: number }) => {
      const { data } = await apiClient.put(`/api/funnels/${funnelId}/steps/${stepId}`, body);
      return data.data as FunnelStep;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["funnels"] });
      toast.success("Step updated");
    },
    onError: () => toast.error("Failed to update step"),
  });
}

export function useDeleteStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ funnelId, stepId }: { funnelId: number; stepId: number }) => {
      await apiClient.delete(`/api/funnels/${funnelId}/steps/${stepId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["funnels"] });
      toast.success("Step deleted");
    },
    onError: () => toast.error("Failed to delete step"),
  });
}

export function useReorderSteps() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ funnelId, order }: { funnelId: number; order: number[] }) => {
      await apiClient.put(`/api/funnels/${funnelId}/steps/reorder`, { order });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["funnels"] });
    },
  });
}
