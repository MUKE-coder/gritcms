"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type {
  EmailList,
  EmailSubscription,
  EmailTemplate,
  EmailCampaign,
  EmailSequence,
  EmailSequenceStep,
  EmailSequenceEnrollment,
  Segment,
  EmailDashboardStats,
  EmailSend,
  CampaignStats,
  Contact,
  ImportResult,
} from "@repo/shared/types";

// --- Dashboard ---

export function useEmailDashboard() {
  return useQuery({
    queryKey: ["email-dashboard"],
    queryFn: async () => {
      const { data } = await apiClient.get("/api/email/dashboard");
      return data.data as EmailDashboardStats;
    },
  });
}

// --- Email Lists ---

export function useEmailLists() {
  return useQuery({
    queryKey: ["email-lists"],
    queryFn: async () => {
      const { data } = await apiClient.get("/api/email/lists");
      return data.data as EmailList[];
    },
  });
}

export function useEmailList(id: number) {
  return useQuery({
    queryKey: ["email-lists", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/email/lists/${id}`);
      return data.data as EmailList;
    },
    enabled: id > 0,
  });
}

export function useCreateEmailList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<EmailList>) => {
      const { data } = await apiClient.post("/api/email/lists", body);
      return data.data as EmailList;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-lists"] });
      toast.success("Email list created");
    },
    onError: () => toast.error("Failed to create email list"),
  });
}

export function useUpdateEmailList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<EmailList> & { id: number }) => {
      const { data } = await apiClient.put(`/api/email/lists/${id}`, body);
      return data.data as EmailList;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["email-lists"] });
      qc.invalidateQueries({ queryKey: ["email-lists", vars.id] });
      toast.success("Email list updated");
    },
    onError: () => toast.error("Failed to update email list"),
  });
}

export function useDeleteEmailList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/api/email/lists/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-lists"] });
      toast.success("Email list deleted");
    },
    onError: () => toast.error("Failed to delete email list"),
  });
}

// --- Subscribers ---

interface SubscriberListParams {
  listId: number;
  page?: number;
  pageSize?: number;
  status?: string;
}

export function useSubscribers(params: SubscriberListParams) {
  const { listId, page = 1, pageSize = 20, status } = params;
  return useQuery({
    queryKey: ["email-subscribers", { listId, page, pageSize, status }],
    queryFn: async () => {
      const sp = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (status) sp.set("status", status);
      const { data } = await apiClient.get(`/api/email/lists/${listId}/subscribers?${sp}`);
      return data as { data: EmailSubscription[]; meta: { total: number; page: number; page_size: number; pages: number } };
    },
    enabled: listId > 0,
  });
}

export function useAddSubscriber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ listId, email, firstName, lastName, contactId }: { listId: number; email?: string; firstName?: string; lastName?: string; contactId?: number }) => {
      const body: Record<string, unknown> = {};
      if (contactId) body.contact_id = contactId;
      if (email) body.email = email;
      if (firstName) body.first_name = firstName;
      if (lastName) body.last_name = lastName;
      const { data } = await apiClient.post(`/api/email/lists/${listId}/subscribers`, body);
      return data.data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["email-subscribers"] });
      qc.invalidateQueries({ queryKey: ["email-lists"] });
      qc.invalidateQueries({ queryKey: ["email-list", vars.listId] });
      toast.success("Subscriber added");
    },
    onError: () => toast.error("Failed to add subscriber"),
  });
}

export function useRemoveSubscriber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ listId, subId }: { listId: number; subId: number }) => {
      await apiClient.delete(`/api/email/lists/${listId}/subscribers/${subId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-subscribers"] });
      qc.invalidateQueries({ queryKey: ["email-lists"] });
      toast.success("Subscriber removed");
    },
    onError: () => toast.error("Failed to remove subscriber"),
  });
}

// --- Templates ---

export function useEmailTemplates(type?: string) {
  return useQuery({
    queryKey: ["email-templates", { type }],
    queryFn: async () => {
      const sp = type ? `?type=${type}` : "";
      const { data } = await apiClient.get(`/api/email/templates${sp}`);
      return data.data as EmailTemplate[];
    },
  });
}

export function useEmailTemplate(id: number) {
  return useQuery({
    queryKey: ["email-templates", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/email/templates/${id}`);
      return data.data as EmailTemplate;
    },
    enabled: id > 0,
  });
}

export function useCreateEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<EmailTemplate>) => {
      const { data } = await apiClient.post("/api/email/templates", body);
      return data.data as EmailTemplate;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Template created");
    },
    onError: () => toast.error("Failed to create template"),
  });
}

export function useUpdateEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<EmailTemplate> & { id: number }) => {
      const { data } = await apiClient.put(`/api/email/templates/${id}`, body);
      return data.data as EmailTemplate;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["email-templates"] });
      qc.invalidateQueries({ queryKey: ["email-templates", vars.id] });
      toast.success("Template updated");
    },
    onError: () => toast.error("Failed to update template"),
  });
}

export function useDeleteEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/api/email/templates/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Template deleted");
    },
    onError: () => toast.error("Failed to delete template"),
  });
}

// --- Campaigns ---

interface CampaignListParams {
  page?: number;
  pageSize?: number;
  status?: string;
}

export function useEmailCampaigns(params: CampaignListParams = {}) {
  const { page = 1, pageSize = 20, status } = params;
  return useQuery({
    queryKey: ["email-campaigns", { page, pageSize, status }],
    queryFn: async () => {
      const sp = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (status) sp.set("status", status);
      const { data } = await apiClient.get(`/api/email/campaigns?${sp}`);
      return data as { data: EmailCampaign[]; meta: { total: number; page: number; page_size: number; pages: number } };
    },
  });
}

export function useEmailCampaign(id: number) {
  return useQuery({
    queryKey: ["email-campaigns", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/email/campaigns/${id}`);
      return data.data as EmailCampaign;
    },
    enabled: id > 0,
  });
}

export function useCreateEmailCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<EmailCampaign>) => {
      const { data } = await apiClient.post("/api/email/campaigns", body);
      return data.data as EmailCampaign;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-campaigns"] });
      toast.success("Campaign created");
    },
    onError: () => toast.error("Failed to create campaign"),
  });
}

export function useUpdateEmailCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<EmailCampaign> & { id: number }) => {
      const { data } = await apiClient.put(`/api/email/campaigns/${id}`, body);
      return data.data as EmailCampaign;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["email-campaigns"] });
      qc.invalidateQueries({ queryKey: ["email-campaigns", vars.id] });
      toast.success("Campaign updated");
    },
    onError: () => toast.error("Failed to update campaign"),
  });
}

export function useDeleteEmailCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/api/email/campaigns/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-campaigns"] });
      toast.success("Campaign deleted");
    },
    onError: () => toast.error("Failed to delete campaign"),
  });
}

export function useScheduleCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, scheduledAt }: { id: number; scheduledAt?: string }) => {
      const { data } = await apiClient.post(`/api/email/campaigns/${id}/schedule`, {
        scheduled_at: scheduledAt || null,
      });
      return data.data as EmailCampaign;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["email-campaigns"] });
      qc.invalidateQueries({ queryKey: ["email-campaigns", vars.id] });
      toast.success(vars.scheduledAt ? "Campaign scheduled" : "Campaign sending");
    },
    onError: () => toast.error("Failed to schedule campaign"),
  });
}

export function useCampaignStats(id: number) {
  return useQuery({
    queryKey: ["email-campaigns", id, "stats"],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/email/campaigns/${id}/stats`);
      return data.data as CampaignStats;
    },
    enabled: id > 0,
  });
}

// --- Sequences ---

export function useEmailSequences() {
  return useQuery({
    queryKey: ["email-sequences"],
    queryFn: async () => {
      const { data } = await apiClient.get("/api/email/sequences");
      return data.data as EmailSequence[];
    },
  });
}

export function useEmailSequence(id: number) {
  return useQuery({
    queryKey: ["email-sequences", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/email/sequences/${id}`);
      return data.data as EmailSequence;
    },
    enabled: id > 0,
  });
}

export function useCreateEmailSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<EmailSequence>) => {
      const { data } = await apiClient.post("/api/email/sequences", body);
      return data.data as EmailSequence;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-sequences"] });
      toast.success("Sequence created");
    },
    onError: () => toast.error("Failed to create sequence"),
  });
}

export function useUpdateEmailSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<EmailSequence> & { id: number }) => {
      const { data } = await apiClient.put(`/api/email/sequences/${id}`, body);
      return data.data as EmailSequence;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["email-sequences"] });
      qc.invalidateQueries({ queryKey: ["email-sequences", vars.id] });
      toast.success("Sequence updated");
    },
    onError: () => toast.error("Failed to update sequence"),
  });
}

export function useDeleteEmailSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/api/email/sequences/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-sequences"] });
      toast.success("Sequence deleted");
    },
    onError: () => toast.error("Failed to delete sequence"),
  });
}

// --- Sequence Steps ---

export function useCreateSequenceStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sequenceId, ...body }: Partial<EmailSequenceStep> & { sequenceId: number }) => {
      const { data } = await apiClient.post(`/api/email/sequences/${sequenceId}/steps`, body);
      return data.data as EmailSequenceStep;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-sequences"] });
      toast.success("Step added");
    },
    onError: () => toast.error("Failed to add step"),
  });
}

export function useUpdateSequenceStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sequenceId, stepId, ...body }: Partial<EmailSequenceStep> & { sequenceId: number; stepId: number }) => {
      const { data } = await apiClient.put(`/api/email/sequences/${sequenceId}/steps/${stepId}`, body);
      return data.data as EmailSequenceStep;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-sequences"] });
      toast.success("Step updated");
    },
    onError: () => toast.error("Failed to update step"),
  });
}

export function useDeleteSequenceStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sequenceId, stepId }: { sequenceId: number; stepId: number }) => {
      await apiClient.delete(`/api/email/sequences/${sequenceId}/steps/${stepId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-sequences"] });
      toast.success("Step deleted");
    },
    onError: () => toast.error("Failed to delete step"),
  });
}

// --- Enrollments ---

export function useEnrollContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sequenceId, contactId }: { sequenceId: number; contactId: number }) => {
      const { data } = await apiClient.post(`/api/email/sequences/${sequenceId}/enroll`, { contact_id: contactId });
      return data.data as EmailSequenceEnrollment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-sequences"] });
      toast.success("Contact enrolled");
    },
    onError: () => toast.error("Failed to enroll contact"),
  });
}

export function useSequenceEnrollments(sequenceId: number) {
  return useQuery({
    queryKey: ["email-sequences", sequenceId, "enrollments"],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/email/sequences/${sequenceId}/enrollments`);
      return data.data as EmailSequenceEnrollment[];
    },
    enabled: sequenceId > 0,
  });
}

export function useCancelEnrollment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sequenceId, enrollId }: { sequenceId: number; enrollId: number }) => {
      await apiClient.delete(`/api/email/sequences/${sequenceId}/enrollments/${enrollId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-sequences"] });
      toast.success("Enrollment cancelled");
    },
    onError: () => toast.error("Failed to cancel enrollment"),
  });
}

// --- Segments ---

export function useSegments() {
  return useQuery({
    queryKey: ["email-segments"],
    queryFn: async () => {
      const { data } = await apiClient.get("/api/email/segments");
      return data.data as Segment[];
    },
  });
}

export function useSegment(id: number) {
  return useQuery({
    queryKey: ["email-segments", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/email/segments/${id}`);
      return data.data as Segment;
    },
    enabled: id > 0,
  });
}

export function useCreateSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<Segment>) => {
      const { data } = await apiClient.post("/api/email/segments", body);
      return data.data as Segment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-segments"] });
      toast.success("Segment created");
    },
    onError: () => toast.error("Failed to create segment"),
  });
}

export function useUpdateSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<Segment> & { id: number }) => {
      const { data } = await apiClient.put(`/api/email/segments/${id}`, body);
      return data.data as Segment;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["email-segments"] });
      qc.invalidateQueries({ queryKey: ["email-segments", vars.id] });
      toast.success("Segment updated");
    },
    onError: () => toast.error("Failed to update segment"),
  });
}

export function useDeleteSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/api/email/segments/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-segments"] });
      toast.success("Segment deleted");
    },
    onError: () => toast.error("Failed to delete segment"),
  });
}

export function useSegmentPreview(id: number) {
  return useQuery({
    queryKey: ["email-segments", id, "preview"],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/email/segments/${id}/preview`);
      return data as { data: Contact[]; total: number };
    },
    enabled: id > 0,
  });
}

// --- Email Sends ---

interface SendListParams {
  page?: number;
  pageSize?: number;
  contactId?: string;
  campaignId?: string;
}

export function useEmailSends(params: SendListParams = {}) {
  const { page = 1, pageSize = 20, contactId, campaignId } = params;
  return useQuery({
    queryKey: ["email-sends", { page, pageSize, contactId, campaignId }],
    queryFn: async () => {
      const sp = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (contactId) sp.set("contact_id", contactId);
      if (campaignId) sp.set("campaign_id", campaignId);
      const { data } = await apiClient.get(`/api/email/sends?${sp}`);
      return data as { data: EmailSend[]; meta: { total: number; page: number; page_size: number; pages: number } };
    },
  });
}

// --- Subscriber Import / Export ---

export function useImportSubscribers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ listId, formData }: { listId: number; formData: FormData }) => {
      const { data } = await apiClient.post(`/api/email/lists/${listId}/import`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data.data as ImportResult;
    },
    onSuccess: (result, { listId }) => {
      qc.invalidateQueries({ queryKey: ["email-subscriptions"] });
      qc.invalidateQueries({ queryKey: ["email-list", listId] });
      toast.success(`Imported: ${result.created} created, ${result.updated} updated`);
    },
    onError: () => toast.error("Failed to import subscribers"),
  });
}

export function useExportSubscribers() {
  return useMutation({
    mutationFn: async ({ listId, format }: { listId: number; format: "csv" | "xlsx" }) => {
      const { data } = await apiClient.get(`/api/email/lists/${listId}/export?format=${format}`, {
        responseType: "blob",
      });
      const ext = format === "xlsx" ? "xlsx" : "csv";
      const blob = new Blob([data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `subscribers-list-${listId}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: () => toast.error("Failed to export subscribers"),
  });
}
