"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

// --- Google Calendar ---

export function useGoogleAuthUrl() {
  return useQuery({
    queryKey: ["integrations-google-auth-url"],
    queryFn: async () => {
      const { data } = await apiClient.get("/api/integrations/google/auth-url");
      return data.data as { url: string };
    },
    enabled: false, // only fetch on demand via refetch()
  });
}

export function useGoogleStatus() {
  return useQuery({
    queryKey: ["integrations-google-status"],
    queryFn: async () => {
      const { data } = await apiClient.get("/api/integrations/google/status");
      return data.data as { connected: boolean };
    },
  });
}

export function useDisconnectGoogle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiClient.post("/api/integrations/google/disconnect");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integrations-google-status"] });
      toast.success("Google Calendar disconnected");
    },
    onError: () => toast.error("Failed to disconnect Google Calendar"),
  });
}

// --- Zoom ---

export function useZoomStatus() {
  return useQuery({
    queryKey: ["integrations-zoom-status"],
    queryFn: async () => {
      const { data } = await apiClient.get("/api/integrations/zoom/status");
      return data.data as { connected: boolean };
    },
  });
}
