"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type {
  Space,
  CommunityMember,
  Thread,
  ThreadReply,
  CommunityEvent,
  EventAttendee,
} from "@repo/shared/types";

// --- Spaces ---

export function useSpaces() {
  return useQuery({
    queryKey: ["community-spaces"],
    queryFn: async () => {
      const { data } = await apiClient.get("/api/community/spaces");
      return data.data as Space[];
    },
  });
}

export function useSpace(id: number) {
  return useQuery({
    queryKey: ["community-spaces", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/community/spaces/${id}`);
      return data.data as Space;
    },
    enabled: id > 0,
  });
}

export function useCreateSpace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<Space>) => {
      const { data } = await apiClient.post("/api/community/spaces", body);
      return data.data as Space;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community-spaces"] });
      toast.success("Space created");
    },
    onError: () => toast.error("Failed to create space"),
  });
}

export function useUpdateSpace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<Space> & { id: number }) => {
      const { data } = await apiClient.put(`/api/community/spaces/${id}`, body);
      return data.data as Space;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["community-spaces"] });
      qc.invalidateQueries({ queryKey: ["community-spaces", vars.id] });
      toast.success("Space updated");
    },
    onError: () => toast.error("Failed to update space"),
  });
}

export function useDeleteSpace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/api/community/spaces/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community-spaces"] });
      toast.success("Space deleted");
    },
    onError: () => toast.error("Failed to delete space"),
  });
}

// --- Members ---

export function useSpaceMembers(spaceId: number, page = 1) {
  return useQuery({
    queryKey: ["community-members", spaceId, page],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/community/spaces/${spaceId}/members?page=${page}`);
      return data as { data: CommunityMember[]; meta: { total: number; page: number; page_size: number; pages: number } };
    },
    enabled: spaceId > 0,
  });
}

export function useAddMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ spaceId, contactId, role }: { spaceId: number; contactId: number; role?: string }) => {
      const { data } = await apiClient.post(`/api/community/spaces/${spaceId}/members`, { contact_id: contactId, role });
      return data.data as CommunityMember;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community-members"] });
      qc.invalidateQueries({ queryKey: ["community-spaces"] });
      toast.success("Member added");
    },
    onError: () => toast.error("Failed to add member"),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: number) => {
      await apiClient.delete(`/api/community/members/${memberId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community-members"] });
      qc.invalidateQueries({ queryKey: ["community-spaces"] });
      toast.success("Member removed");
    },
    onError: () => toast.error("Failed to remove member"),
  });
}

// --- Threads ---

interface ThreadListParams {
  spaceId: number;
  page?: number;
  sort?: string;
  type?: string;
}

export function useThreads(params: ThreadListParams) {
  const { spaceId, page = 1, sort = "recent", type } = params;
  return useQuery({
    queryKey: ["community-threads", spaceId, { page, sort, type }],
    queryFn: async () => {
      const sp = new URLSearchParams({ page: String(page), sort });
      if (type) sp.set("type", type);
      const { data } = await apiClient.get(`/api/community/spaces/${spaceId}/threads?${sp}`);
      return data as { data: Thread[]; meta: { total: number; page: number; page_size: number; pages: number } };
    },
    enabled: spaceId > 0,
  });
}

export function useThread(threadId: number) {
  return useQuery({
    queryKey: ["community-threads", "detail", threadId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/community/threads/${threadId}`);
      return data.data as Thread;
    },
    enabled: threadId > 0,
  });
}

export function useCreateThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ spaceId, ...body }: Partial<Thread> & { spaceId: number }) => {
      const { data } = await apiClient.post(`/api/community/spaces/${spaceId}/threads`, body);
      return data.data as Thread;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community-threads"] });
      toast.success("Thread created");
    },
    onError: () => toast.error("Failed to create thread"),
  });
}

export function useDeleteThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (threadId: number) => {
      await apiClient.delete(`/api/community/threads/${threadId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community-threads"] });
      toast.success("Thread deleted");
    },
    onError: () => toast.error("Failed to delete thread"),
  });
}

export function usePinThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (threadId: number) => {
      const { data } = await apiClient.post(`/api/community/threads/${threadId}/pin`);
      return data.data as Thread;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community-threads"] });
      toast.success("Thread pin toggled");
    },
    onError: () => toast.error("Failed to update thread"),
  });
}

export function useCloseThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (threadId: number) => {
      const { data } = await apiClient.post(`/api/community/threads/${threadId}/close`);
      return data.data as Thread;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community-threads"] });
      toast.success("Thread status toggled");
    },
    onError: () => toast.error("Failed to update thread"),
  });
}

// --- Replies ---

export function useCreateReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ threadId, ...body }: Partial<ThreadReply> & { threadId: number }) => {
      const { data } = await apiClient.post(`/api/community/threads/${threadId}/replies`, body);
      return data.data as ThreadReply;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community-threads"] });
      toast.success("Reply posted");
    },
    onError: () => toast.error("Failed to post reply"),
  });
}

export function useDeleteReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (replyId: number) => {
      await apiClient.delete(`/api/community/replies/${replyId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community-threads"] });
      toast.success("Reply deleted");
    },
    onError: () => toast.error("Failed to delete reply"),
  });
}

// --- Events ---

export function useCommunityEvents(spaceId?: number) {
  return useQuery({
    queryKey: ["community-events", { spaceId }],
    queryFn: async () => {
      const sp = spaceId ? `?space_id=${spaceId}` : "";
      const { data } = await apiClient.get(`/api/community/events${sp}`);
      return data.data as CommunityEvent[];
    },
  });
}

export function useCommunityEvent(id: number) {
  return useQuery({
    queryKey: ["community-events", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/community/events/${id}`);
      return data.data as CommunityEvent;
    },
    enabled: id > 0,
  });
}

export function useCreateCommunityEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<CommunityEvent>) => {
      const { data } = await apiClient.post("/api/community/events", body);
      return data.data as CommunityEvent;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community-events"] });
      toast.success("Event created");
    },
    onError: () => toast.error("Failed to create event"),
  });
}

export function useUpdateCommunityEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<CommunityEvent> & { id: number }) => {
      const { data } = await apiClient.put(`/api/community/events/${id}`, body);
      return data.data as CommunityEvent;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["community-events"] });
      qc.invalidateQueries({ queryKey: ["community-events", vars.id] });
      toast.success("Event updated");
    },
    onError: () => toast.error("Failed to update event"),
  });
}

export function useDeleteCommunityEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/api/community/events/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community-events"] });
      toast.success("Event deleted");
    },
    onError: () => toast.error("Failed to delete event"),
  });
}
