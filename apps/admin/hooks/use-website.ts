"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type { Page, Post, PostCategory, PostTag, Menu } from "@repo/shared/types";

// --- Pages ---

interface PageListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export function usePages(params: PageListParams = {}) {
  const { page = 1, pageSize = 20, search, status, sortBy = "created_at", sortOrder = "desc" } = params;
  return useQuery({
    queryKey: ["pages", { page, pageSize, search, status, sortBy, sortOrder }],
    queryFn: async () => {
      const sp = new URLSearchParams({ page: String(page), page_size: String(pageSize), sort_by: sortBy, sort_order: sortOrder });
      if (search) sp.set("search", search);
      if (status) sp.set("status", status);
      const { data } = await apiClient.get(`/api/pages?${sp}`);
      return data as { data: Page[]; meta: { total: number; page: number; page_size: number; pages: number } };
    },
  });
}

export function usePage(id: number) {
  return useQuery({
    queryKey: ["pages", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/pages/${id}`);
      return data.data as Page;
    },
    enabled: id > 0,
  });
}

export function useCreatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<Page>) => {
      const { data } = await apiClient.post("/api/pages", body);
      return data.data as Page;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pages"] });
      toast.success("Page created");
    },
    onError: () => toast.error("Failed to create page"),
  });
}

export function useUpdatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<Page> & { id: number }) => {
      const { data } = await apiClient.put(`/api/pages/${id}`, body);
      return data.data as Page;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["pages"] });
      qc.invalidateQueries({ queryKey: ["pages", vars.id] });
      toast.success("Page updated");
    },
    onError: () => toast.error("Failed to update page"),
  });
}

export function useDeletePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/api/pages/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pages"] });
      toast.success("Page deleted");
    },
    onError: () => toast.error("Failed to delete page"),
  });
}

// --- Posts ---

interface PostListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  category?: string;
  tag?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export function usePosts(params: PostListParams = {}) {
  const { page = 1, pageSize = 20, search, status, category, tag, sortBy = "created_at", sortOrder = "desc" } = params;
  return useQuery({
    queryKey: ["posts", { page, pageSize, search, status, category, tag, sortBy, sortOrder }],
    queryFn: async () => {
      const sp = new URLSearchParams({ page: String(page), page_size: String(pageSize), sort_by: sortBy, sort_order: sortOrder });
      if (search) sp.set("search", search);
      if (status) sp.set("status", status);
      if (category) sp.set("category", category);
      if (tag) sp.set("tag", tag);
      const { data } = await apiClient.get(`/api/posts?${sp}`);
      return data as { data: Post[]; meta: { total: number; page: number; page_size: number; pages: number } };
    },
  });
}

export function usePost(id: number) {
  return useQuery({
    queryKey: ["posts", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/posts/${id}`);
      return data.data as Post;
    },
    enabled: id > 0,
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const { data } = await apiClient.post("/api/posts", body);
      return data.data as Post;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Post created");
    },
    onError: () => toast.error("Failed to create post"),
  });
}

export function useUpdatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: number } & Record<string, unknown>) => {
      const { data } = await apiClient.put(`/api/posts/${id}`, body);
      return data.data as Post;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["posts"] });
      qc.invalidateQueries({ queryKey: ["posts", vars.id] });
      toast.success("Post updated");
    },
    onError: () => toast.error("Failed to update post"),
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/api/posts/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Post deleted");
    },
    onError: () => toast.error("Failed to delete post"),
  });
}

// --- Categories ---

export function usePostCategories() {
  return useQuery({
    queryKey: ["post-categories"],
    queryFn: async () => {
      const { data } = await apiClient.get("/api/post-categories");
      return data.data as PostCategory[];
    },
  });
}

export function useCreatePostCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; slug?: string; description?: string; parent_id?: number }) => {
      const { data } = await apiClient.post("/api/post-categories", body);
      return data.data as PostCategory;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["post-categories"] });
      toast.success("Category created");
    },
    onError: () => toast.error("Failed to create category"),
  });
}

export function useUpdatePostCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: number; name?: string; slug?: string; description?: string }) => {
      const { data } = await apiClient.put(`/api/post-categories/${id}`, body);
      return data.data as PostCategory;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["post-categories"] });
      toast.success("Category updated");
    },
    onError: () => toast.error("Failed to update category"),
  });
}

export function useDeletePostCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/api/post-categories/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["post-categories"] });
      toast.success("Category deleted");
    },
    onError: () => toast.error("Failed to delete category"),
  });
}

// --- Post Tags ---

export function usePostTags() {
  return useQuery({
    queryKey: ["post-tags"],
    queryFn: async () => {
      const { data } = await apiClient.get("/api/post-tags");
      return data.data as PostTag[];
    },
  });
}

export function useCreatePostTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; slug?: string }) => {
      const { data } = await apiClient.post("/api/post-tags", body);
      return data.data as PostTag;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["post-tags"] });
      toast.success("Tag created");
    },
    onError: () => toast.error("Failed to create tag"),
  });
}

export function useDeletePostTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/api/post-tags/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["post-tags"] });
      toast.success("Tag deleted");
    },
    onError: () => toast.error("Failed to delete tag"),
  });
}

// --- Menus ---

export function useMenus() {
  return useQuery({
    queryKey: ["menus"],
    queryFn: async () => {
      const { data } = await apiClient.get("/api/menus");
      return data.data as Menu[];
    },
  });
}

export function useMenu(id: number) {
  return useQuery({
    queryKey: ["menus", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/menus/${id}`);
      return data.data as Menu;
    },
    enabled: id > 0,
  });
}

export function useCreateMenu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; slug?: string; location: string }) => {
      const { data } = await apiClient.post("/api/menus", body);
      return data.data as Menu;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menus"] });
      toast.success("Menu created");
    },
    onError: () => toast.error("Failed to create menu"),
  });
}

export function useUpdateMenu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: number; name?: string; location?: string }) => {
      const { data } = await apiClient.put(`/api/menus/${id}`, body);
      return data.data as Menu;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["menus"] });
      qc.invalidateQueries({ queryKey: ["menus", vars.id] });
      toast.success("Menu updated");
    },
    onError: () => toast.error("Failed to update menu"),
  });
}

export function useDeleteMenu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/api/menus/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menus"] });
      toast.success("Menu deleted");
    },
    onError: () => toast.error("Failed to delete menu"),
  });
}

export function useCreateMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ menuId, ...body }: { menuId: number; label: string; url?: string; page_id?: number; target?: string; sort_order?: number; parent_id?: number }) => {
      const { data } = await apiClient.post(`/api/menus/${menuId}/items`, body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menus"] });
      toast.success("Menu item added");
    },
    onError: () => toast.error("Failed to add menu item"),
  });
}

export function useUpdateMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ menuId, itemId, ...body }: { menuId: number; itemId: number; label?: string; url?: string; sort_order?: number }) => {
      const { data } = await apiClient.put(`/api/menus/${menuId}/items/${itemId}`, body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menus"] });
      toast.success("Menu item updated");
    },
    onError: () => toast.error("Failed to update menu item"),
  });
}

export function useDeleteMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ menuId, itemId }: { menuId: number; itemId: number }) => {
      await apiClient.delete(`/api/menus/${menuId}/items/${itemId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menus"] });
      toast.success("Menu item deleted");
    },
    onError: () => toast.error("Failed to delete menu item"),
  });
}

export function useReorderMenuItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ menuId, items }: { menuId: number; items: { id: number; sort_order: number; parent_id?: number }[] }) => {
      await apiClient.put(`/api/menus/${menuId}/reorder`, { items });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menus"] });
    },
  });
}

// --- Settings ---

export function useSettings(group: string) {
  return useQuery({
    queryKey: ["settings", group],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/settings/${group}`);
      return data.data as Record<string, string>;
    },
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ group, settings }: { group: string; settings: Record<string, string> }) => {
      await apiClient.put(`/api/settings/${group}`, settings);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["settings", vars.group] });
      toast.success("Settings saved");
    },
    onError: () => toast.error("Failed to save settings"),
  });
}
