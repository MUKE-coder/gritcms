"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type {
  Workflow,
  WorkflowAction,
  WorkflowExecution,
} from "@repo/shared/types";

// --- Workflows ---

export function useWorkflows(page = 1, search = "", status = "") {
  return useQuery({
    queryKey: ["workflows", { page, search, status }],
    queryFn: async () => {
      const sp = new URLSearchParams({ page: String(page) });
      if (search) sp.set("search", search);
      if (status) sp.set("status", status);
      const { data } = await apiClient.get(`/api/workflows?${sp}`);
      return data as { data: Workflow[]; meta: { total: number; page: number; page_size: number; pages: number } };
    },
  });
}

export function useWorkflow(id: number) {
  return useQuery({
    queryKey: ["workflows", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/workflows/${id}`);
      return data.data as Workflow;
    },
    enabled: id > 0,
  });
}

export function useCreateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<Workflow>) => {
      const { data } = await apiClient.post("/api/workflows", body);
      return data.data as Workflow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Workflow created");
    },
    onError: () => toast.error("Failed to create workflow"),
  });
}

export function useUpdateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<Workflow> & { id: number }) => {
      const { data } = await apiClient.put(`/api/workflows/${id}`, body);
      return data.data as Workflow;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["workflows"] });
      qc.invalidateQueries({ queryKey: ["workflows", vars.id] });
      toast.success("Workflow updated");
    },
    onError: () => toast.error("Failed to update workflow"),
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/api/workflows/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Workflow deleted");
    },
    onError: () => toast.error("Failed to delete workflow"),
  });
}

export function useTriggerWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, contactId }: { id: number; contactId: number }) => {
      const { data } = await apiClient.post(`/api/workflows/${id}/trigger`, { contact_id: contactId });
      return data.data as WorkflowExecution;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflows"] });
      qc.invalidateQueries({ queryKey: ["workflow-executions"] });
      toast.success("Workflow triggered");
    },
    onError: () => toast.error("Failed to trigger workflow"),
  });
}

// --- Actions ---

export function useCreateAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workflowId, ...body }: Partial<WorkflowAction> & { workflowId: number }) => {
      const { data } = await apiClient.post(`/api/workflows/${workflowId}/actions`, body);
      return data.data as WorkflowAction;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Action added");
    },
    onError: () => toast.error("Failed to add action"),
  });
}

export function useUpdateAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workflowId, actionId, ...body }: Partial<WorkflowAction> & { workflowId: number; actionId: number }) => {
      const { data } = await apiClient.put(`/api/workflows/${workflowId}/actions/${actionId}`, body);
      return data.data as WorkflowAction;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Action updated");
    },
    onError: () => toast.error("Failed to update action"),
  });
}

export function useDeleteAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workflowId, actionId }: { workflowId: number; actionId: number }) => {
      await apiClient.delete(`/api/workflows/${workflowId}/actions/${actionId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Action removed");
    },
    onError: () => toast.error("Failed to remove action"),
  });
}

export function useReorderActions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workflowId, order }: { workflowId: number; order: number[] }) => {
      await apiClient.put(`/api/workflows/${workflowId}/actions/reorder`, { order });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflows"] });
    },
  });
}

// --- Executions ---

export function useExecutions(page = 1, workflowId = "", status = "") {
  return useQuery({
    queryKey: ["workflow-executions", { page, workflowId, status }],
    queryFn: async () => {
      const sp = new URLSearchParams({ page: String(page) });
      if (workflowId) sp.set("workflow_id", workflowId);
      if (status) sp.set("status", status);
      const { data } = await apiClient.get(`/api/workflows/executions?${sp}`);
      return data as { data: WorkflowExecution[]; meta: { total: number; page: number; page_size: number; pages: number } };
    },
  });
}

export function useExecution(id: number) {
  return useQuery({
    queryKey: ["workflow-executions", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/workflows/executions/${id}`);
      return data.data as WorkflowExecution;
    },
    enabled: id > 0,
  });
}
