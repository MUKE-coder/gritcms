"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type { Contact, Tag, ImportResult } from "@repo/shared/types";

// --- Contacts ---

interface ContactListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  source?: string;
  tag?: string;
}

export function useContacts(params: ContactListParams = {}) {
  const { page = 1, pageSize = 20, search, source, tag } = params;
  return useQuery({
    queryKey: ["contacts", { page, pageSize, search, source, tag }],
    queryFn: async () => {
      const sp = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (search) sp.set("search", search);
      if (source) sp.set("source", source);
      if (tag) sp.set("tag", tag);
      const { data } = await apiClient.get(`/api/contacts?${sp}`);
      return data as {
        data: Contact[];
        meta: { total: number; page: number; page_size: number; pages: number };
      };
    },
  });
}

export function useContact(id: number) {
  return useQuery({
    queryKey: ["contacts", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/contacts/${id}`);
      return data.data as Contact;
    },
    enabled: id > 0,
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<Contact> & { tag_ids?: number[] }) => {
      const { data } = await apiClient.post("/api/contacts", body);
      return data.data as Contact;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact created");
    },
    onError: () => toast.error("Failed to create contact"),
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<Contact> & { id: number; tag_ids?: number[] }) => {
      const { data } = await apiClient.put(`/api/contacts/${id}`, body);
      return data.data as Contact;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contacts", vars.id] });
      toast.success("Contact updated");
    },
    onError: () => toast.error("Failed to update contact"),
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/api/contacts/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact deleted");
    },
    onError: () => toast.error("Failed to delete contact"),
  });
}

// --- Tags ---

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data } = await apiClient.get("/api/tags");
      return data.data as Tag[];
    },
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; color: string }) => {
      const { data } = await apiClient.post("/api/tags", body);
      return data.data as Tag;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
      toast.success("Tag created");
    },
    onError: () => toast.error("Failed to create tag"),
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/api/tags/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tags"] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Tag deleted");
    },
    onError: () => toast.error("Failed to delete tag"),
  });
}

// --- Import / Export ---

export function useImportContacts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await apiClient.post("/api/contacts/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data.data as ImportResult;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(`Imported: ${result.created} created, ${result.updated} updated`);
    },
    onError: () => toast.error("Failed to import contacts"),
  });
}

export function useExportContacts() {
  return useMutation({
    mutationFn: async (format: "csv" | "xlsx") => {
      const { data } = await apiClient.get(`/api/contacts/export?format=${format}`, {
        responseType: "blob",
      });
      const ext = format === "xlsx" ? "xlsx" : "csv";
      const blob = new Blob([data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contacts.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: () => toast.error("Failed to export contacts"),
  });
}
