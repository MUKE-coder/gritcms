"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  AnalyticsDashboard,
  RevenueDataPoint,
  SubscriberGrowthPoint,
  ProductStat,
  ContactProfile,
  ContactActivity,
} from "@repo/shared/types";

export function useAnalyticsDashboard() {
  return useQuery({
    queryKey: ["analytics-dashboard"],
    queryFn: async () => {
      const { data } = await apiClient.get("/api/analytics/dashboard");
      return data.data as AnalyticsDashboard;
    },
  });
}

export function useRevenueChart(days: number = 30) {
  return useQuery({
    queryKey: ["analytics-revenue-chart", days],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/analytics/revenue-chart?days=${days}`);
      return data.data as RevenueDataPoint[];
    },
  });
}

export function useSubscriberGrowth(days: number = 30) {
  return useQuery({
    queryKey: ["analytics-subscriber-growth", days],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/analytics/subscriber-growth?days=${days}`);
      return data.data as SubscriberGrowthPoint[];
    },
  });
}

export function useTopProducts(limit: number = 10) {
  return useQuery({
    queryKey: ["analytics-top-products", limit],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/analytics/top-products?limit=${limit}`);
      return data.data as ProductStat[];
    },
  });
}

interface TimelineParams {
  page?: number;
  pageSize?: number;
  module?: string;
  contactId?: string;
}

export function useActivityTimeline(params: TimelineParams = {}) {
  const { page = 1, pageSize = 50, module, contactId } = params;
  return useQuery({
    queryKey: ["activity-timeline", { page, pageSize, module, contactId }],
    queryFn: async () => {
      const sp = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (module) sp.set("module", module);
      if (contactId) sp.set("contact_id", contactId);
      const { data } = await apiClient.get(`/api/analytics/activity-timeline?${sp}`);
      return data as { data: ContactActivity[]; meta: { total: number; page: number; page_size: number; pages: number } };
    },
  });
}

export function useContactProfile(id: number) {
  return useQuery({
    queryKey: ["contact-profile", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/contacts/${id}/profile`);
      return data.data as ContactProfile;
    },
    enabled: id > 0,
  });
}
