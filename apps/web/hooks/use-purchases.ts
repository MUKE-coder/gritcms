"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PurchaseData } from "@repo/shared/types";

export function useMyPurchases() {
  return useQuery({
    queryKey: ["my-purchases"],
    queryFn: async () => {
      const { data } = await api.get("/api/student/purchases");
      return data.data as PurchaseData[];
    },
  });
}

export function useMyPurchase(orderId: number) {
  return useQuery({
    queryKey: ["my-purchase", orderId],
    queryFn: async () => {
      const { data } = await api.get(`/api/student/purchases/${orderId}`);
      return data.data as PurchaseData;
    },
    enabled: orderId > 0,
  });
}
