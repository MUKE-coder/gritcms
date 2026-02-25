"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type {
  AffiliateProgram,
  AffiliateAccount,
  Commission,
  Payout,
  AffiliateDashboard,
} from "@repo/shared/types";

// --- Programs ---

export function useAffiliatePrograms() {
  return useQuery({
    queryKey: ["affiliate-programs"],
    queryFn: async () => {
      const { data } = await apiClient.get("/api/affiliates/programs");
      return data.data as (AffiliateProgram & { account_count: number })[];
    },
  });
}

export function useAffiliateProgram(id: number) {
  return useQuery({
    queryKey: ["affiliate-programs", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/affiliates/programs/${id}`);
      return data.data as AffiliateProgram;
    },
    enabled: id > 0,
  });
}

export function useCreateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<AffiliateProgram>) => {
      const { data } = await apiClient.post("/api/affiliates/programs", body);
      return data.data as AffiliateProgram;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["affiliate-programs"] });
      toast.success("Program created");
    },
    onError: () => toast.error("Failed to create program"),
  });
}

export function useUpdateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<AffiliateProgram> & { id: number }) => {
      const { data } = await apiClient.put(`/api/affiliates/programs/${id}`, body);
      return data.data as AffiliateProgram;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["affiliate-programs"] });
      toast.success("Program updated");
    },
    onError: () => toast.error("Failed to update program"),
  });
}

export function useDeleteProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/api/affiliates/programs/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["affiliate-programs"] });
      toast.success("Program deleted");
    },
    onError: () => toast.error("Failed to delete program"),
  });
}

// --- Accounts ---

export function useAffiliateAccounts(page = 1, status = "", programId = "") {
  return useQuery({
    queryKey: ["affiliate-accounts", { page, status, programId }],
    queryFn: async () => {
      const sp = new URLSearchParams({ page: String(page) });
      if (status) sp.set("status", status);
      if (programId) sp.set("program_id", programId);
      const { data } = await apiClient.get(`/api/affiliates/accounts?${sp}`);
      return data as { data: AffiliateAccount[]; meta: { total: number; page: number; page_size: number; pages: number } };
    },
  });
}

export function useAffiliateAccount(id: number) {
  return useQuery({
    queryKey: ["affiliate-accounts", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/affiliates/accounts/${id}`);
      return data.data as AffiliateAccount;
    },
    enabled: id > 0,
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { contact_id: number; program_id: number }) => {
      const { data } = await apiClient.post("/api/affiliates/accounts", body);
      return data.data as AffiliateAccount;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["affiliate-accounts"] });
      toast.success("Affiliate account created");
    },
    onError: () => toast.error("Failed to create account"),
  });
}

export function useUpdateAccountStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const { data } = await apiClient.put(`/api/affiliates/accounts/${id}/status`, { status });
      return data.data as AffiliateAccount;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["affiliate-accounts"] });
      toast.success("Account status updated");
    },
    onError: () => toast.error("Failed to update account"),
  });
}

// --- Links ---

export function useCreateLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ accountId, ...body }: { accountId: number; url: string; slug?: string }) => {
      const { data } = await apiClient.post(`/api/affiliates/accounts/${accountId}/links`, body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["affiliate-accounts"] });
      toast.success("Link created");
    },
    onError: () => toast.error("Failed to create link"),
  });
}

export function useDeleteLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (linkId: number) => {
      await apiClient.delete(`/api/affiliates/links/${linkId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["affiliate-accounts"] });
      toast.success("Link deleted");
    },
    onError: () => toast.error("Failed to delete link"),
  });
}

// --- Commissions ---

export function useCommissions(page = 1, status = "", accountId = "") {
  return useQuery({
    queryKey: ["affiliate-commissions", { page, status, accountId }],
    queryFn: async () => {
      const sp = new URLSearchParams({ page: String(page) });
      if (status) sp.set("status", status);
      if (accountId) sp.set("account_id", accountId);
      const { data } = await apiClient.get(`/api/affiliates/commissions?${sp}`);
      return data as { data: Commission[]; meta: { total: number; page: number; page_size: number; pages: number } };
    },
  });
}

export function useApproveCommission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.post(`/api/affiliates/commissions/${id}/approve`);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["affiliate-commissions"] });
      qc.invalidateQueries({ queryKey: ["affiliate-accounts"] });
      toast.success("Commission approved");
    },
    onError: () => toast.error("Failed to approve commission"),
  });
}

export function useRejectCommission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.post(`/api/affiliates/commissions/${id}/reject`);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["affiliate-commissions"] });
      toast.success("Commission rejected");
    },
    onError: () => toast.error("Failed to reject commission"),
  });
}

// --- Payouts ---

export function usePayouts(page = 1, status = "") {
  return useQuery({
    queryKey: ["affiliate-payouts", { page, status }],
    queryFn: async () => {
      const sp = new URLSearchParams({ page: String(page) });
      if (status) sp.set("status", status);
      const { data } = await apiClient.get(`/api/affiliates/payouts?${sp}`);
      return data as { data: Payout[]; meta: { total: number; page: number; page_size: number; pages: number } };
    },
  });
}

export function useCreatePayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { account_id: number; amount: number; method?: string }) => {
      const { data } = await apiClient.post("/api/affiliates/payouts", body);
      return data.data as Payout;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["affiliate-payouts"] });
      qc.invalidateQueries({ queryKey: ["affiliate-accounts"] });
      toast.success("Payout created");
    },
    onError: () => toast.error("Failed to create payout"),
  });
}

export function useProcessPayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.post(`/api/affiliates/payouts/${id}/process`);
      return data.data as Payout;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["affiliate-payouts"] });
      qc.invalidateQueries({ queryKey: ["affiliate-accounts"] });
      qc.invalidateQueries({ queryKey: ["affiliate-commissions"] });
      toast.success("Payout processed");
    },
    onError: () => toast.error("Failed to process payout"),
  });
}

// --- Dashboard ---

export function useAffiliateDashboard() {
  return useQuery({
    queryKey: ["affiliate-dashboard"],
    queryFn: async () => {
      const { data } = await apiClient.get("/api/affiliates/dashboard");
      return data.data as AffiliateDashboard;
    },
  });
}
