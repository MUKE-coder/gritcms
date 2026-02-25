import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

interface ResourceQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  filters?: Record<string, string>;
}

interface PaginatedResponse<T = Record<string, unknown>> {
  data: T[];
  meta: {
    total: number;
    page: number;
    page_size: number;
    pages: number;
  };
}

export function useResource<T = Record<string, unknown>>(
  endpoint: string,
  params: ResourceQueryParams = {}
) {
  const { page = 1, pageSize = 20, search, sortBy, sortOrder, filters } = params;

  return useQuery<PaginatedResponse<T>>({
    queryKey: [endpoint, { page, pageSize, search, sortBy, sortOrder, filters }],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });

      if (search) searchParams.set("search", search);
      if (sortBy) {
        searchParams.set("sort_by", sortBy);
        searchParams.set("sort_order", sortOrder ?? "desc");
      }
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) searchParams.set(key, value);
        });
      }

      const { data } = await apiClient.get(`${endpoint}?${searchParams}`);
      return data;
    },
  });
}

export function useResourceItem<T = Record<string, unknown>>(
  endpoint: string,
  id: number,
  options?: { enabled?: boolean }
) {
  return useQuery<{ data: T }>({
    queryKey: [endpoint, id],
    queryFn: async () => {
      const { data } = await apiClient.get(`${endpoint}/${id}`);
      return data;
    },
    enabled: (options?.enabled ?? true) && id > 0,
  });
}

export function useCreateResource(endpoint: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const { data } = await apiClient.post(endpoint, body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      toast.success("Created successfully");
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(axiosErr?.response?.data?.error?.message || "Failed to create");
    },
  });
}

export function useUpdateResource(endpoint: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, body }: { id: number; body: Record<string, unknown> }) => {
      const { data } = await apiClient.put(`${endpoint}/${id}`, body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      toast.success("Updated successfully");
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(axiosErr?.response?.data?.error?.message || "Failed to update");
    },
  });
}

export function useDeleteResource(endpoint: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`${endpoint}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      toast.success("Deleted successfully");
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(axiosErr?.response?.data?.error?.message || "Failed to delete");
    },
  });
}

export function useBulkDeleteResource(endpoint: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => apiClient.delete(`${endpoint}/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      toast.success("Deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete some items");
    },
  });
}
