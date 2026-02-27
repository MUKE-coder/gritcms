"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { CheckoutResponse, CheckoutStatus } from "@repo/shared/types";

interface CheckoutInput {
  type: "product" | "course";
  product_id?: number;
  course_id?: number;
  price_id?: number;
  coupon_code?: string;
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: async (input: CheckoutInput) => {
      const { data } = await api.post("/api/checkout", input);
      return data.data as CheckoutResponse;
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.error || "Failed to initialize checkout";
      toast.error(msg);
    },
  });
}

export function useConfirmCheckout() {
  return useMutation({
    mutationFn: async (orderId: number) => {
      const { data } = await api.post(`/api/checkout/${orderId}/confirm`);
      return data.data as { status: string };
    },
  });
}

export function useCheckoutStatus(orderId: number | null) {
  return useQuery({
    queryKey: ["checkout-status", orderId],
    queryFn: async () => {
      const { data } = await api.get(`/api/checkout/${orderId}/status`);
      return data.data as CheckoutStatus;
    },
    enabled: !!orderId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "paid" || status === "failed") return false;
      return 2000;
    },
  });
}
