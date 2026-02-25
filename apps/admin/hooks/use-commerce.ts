"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type {
  Product,
  Price,
  ProductVariant,
  Order,
  Coupon,
  Subscription,
  RevenueDashboard,
} from "@repo/shared/types";

// --- Revenue Dashboard ---

export function useRevenueDashboard() {
  return useQuery({
    queryKey: ["commerce-dashboard"],
    queryFn: async () => {
      const { data } = await apiClient.get("/api/commerce/dashboard");
      return data.data as RevenueDashboard;
    },
  });
}

// --- Products ---

interface ProductListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  type?: string;
  search?: string;
}

export function useProducts(params: ProductListParams = {}) {
  const { page = 1, pageSize = 20, status, type, search } = params;
  return useQuery({
    queryKey: ["products", { page, pageSize, status, type, search }],
    queryFn: async () => {
      const sp = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (status) sp.set("status", status);
      if (type) sp.set("type", type);
      if (search) sp.set("search", search);
      const { data } = await apiClient.get(`/api/products?${sp}`);
      return data as { data: Product[]; meta: { total: number; page: number; page_size: number; pages: number } };
    },
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/products/${id}`);
      return data.data as Product;
    },
    enabled: id > 0,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<Product>) => {
      const { data } = await apiClient.post("/api/products", body);
      return data.data as Product;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product created");
    },
    onError: () => toast.error("Failed to create product"),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<Product> & { id: number }) => {
      const { data } = await apiClient.put(`/api/products/${id}`, body);
      return data.data as Product;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["products", vars.id] });
      toast.success("Product updated");
    },
    onError: () => toast.error("Failed to update product"),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/api/products/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted");
    },
    onError: () => toast.error("Failed to delete product"),
  });
}

// --- Prices ---

export function useCreatePrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, ...body }: Partial<Price> & { productId: number }) => {
      const { data } = await apiClient.post(`/api/products/${productId}/prices`, body);
      return data.data as Price;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["products", vars.productId] });
      toast.success("Price added");
    },
    onError: () => toast.error("Failed to add price"),
  });
}

export function useUpdatePrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, priceId, ...body }: Partial<Price> & { productId: number; priceId: number }) => {
      const { data } = await apiClient.put(`/api/products/${productId}/prices/${priceId}`, body);
      return data.data as Price;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["products", vars.productId] });
      toast.success("Price updated");
    },
    onError: () => toast.error("Failed to update price"),
  });
}

export function useDeletePrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, priceId }: { productId: number; priceId: number }) => {
      await apiClient.delete(`/api/products/${productId}/prices/${priceId}`);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["products", vars.productId] });
      toast.success("Price deleted");
    },
    onError: () => toast.error("Failed to delete price"),
  });
}

// --- Variants ---

export function useCreateVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, ...body }: Partial<ProductVariant> & { productId: number }) => {
      const { data } = await apiClient.post(`/api/products/${productId}/variants`, body);
      return data.data as ProductVariant;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["products", vars.productId] });
      toast.success("Variant added");
    },
    onError: () => toast.error("Failed to add variant"),
  });
}

export function useUpdateVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, variantId, ...body }: Partial<ProductVariant> & { productId: number; variantId: number }) => {
      const { data } = await apiClient.put(`/api/products/${productId}/variants/${variantId}`, body);
      return data.data as ProductVariant;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["products", vars.productId] });
      toast.success("Variant updated");
    },
    onError: () => toast.error("Failed to update variant"),
  });
}

export function useDeleteVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, variantId }: { productId: number; variantId: number }) => {
      await apiClient.delete(`/api/products/${productId}/variants/${variantId}`);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["products", vars.productId] });
      toast.success("Variant deleted");
    },
    onError: () => toast.error("Failed to delete variant"),
  });
}

// --- Orders ---

interface OrderListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  contactId?: string;
}

export function useOrders(params: OrderListParams = {}) {
  const { page = 1, pageSize = 20, status, contactId } = params;
  return useQuery({
    queryKey: ["orders", { page, pageSize, status, contactId }],
    queryFn: async () => {
      const sp = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (status) sp.set("status", status);
      if (contactId) sp.set("contact_id", contactId);
      const { data } = await apiClient.get(`/api/orders?${sp}`);
      return data as { data: Order[]; meta: { total: number; page: number; page_size: number; pages: number } };
    },
  });
}

export function useOrder(id: number) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/orders/${id}`);
      return data.data as Order;
    },
    enabled: id > 0,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      contact_id: number;
      items: Array<{ product_id: number; price_id?: number; variant_id?: number; quantity: number }>;
      coupon_code?: string;
      currency?: string;
    }) => {
      const { data } = await apiClient.post("/api/orders", body);
      return data.data as Order;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["commerce-dashboard"] });
      toast.success("Order created");
    },
    onError: () => toast.error("Failed to create order"),
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      const { data } = await apiClient.put(`/api/orders/${orderId}/status`, { status });
      return data.data as Order;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["orders", vars.orderId] });
      qc.invalidateQueries({ queryKey: ["commerce-dashboard"] });
      toast.success("Order status updated");
    },
    onError: () => toast.error("Failed to update order status"),
  });
}

export function useRefundOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: number) => {
      const { data } = await apiClient.post(`/api/orders/${orderId}/refund`);
      return data.data as Order;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["commerce-dashboard"] });
      toast.success("Order refunded");
    },
    onError: () => toast.error("Failed to refund order"),
  });
}

// --- Coupons ---

export function useCoupons() {
  return useQuery({
    queryKey: ["coupons"],
    queryFn: async () => {
      const { data } = await apiClient.get("/api/coupons");
      return data.data as Coupon[];
    },
  });
}

export function useCoupon(id: number) {
  return useQuery({
    queryKey: ["coupons", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/coupons/${id}`);
      return data.data as Coupon;
    },
    enabled: id > 0,
  });
}

export function useCreateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<Coupon>) => {
      const { data } = await apiClient.post("/api/coupons", body);
      return data.data as Coupon;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coupons"] });
      toast.success("Coupon created");
    },
    onError: () => toast.error("Failed to create coupon"),
  });
}

export function useUpdateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<Coupon> & { id: number }) => {
      const { data } = await apiClient.put(`/api/coupons/${id}`, body);
      return data.data as Coupon;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["coupons"] });
      qc.invalidateQueries({ queryKey: ["coupons", vars.id] });
      toast.success("Coupon updated");
    },
    onError: () => toast.error("Failed to update coupon"),
  });
}

export function useDeleteCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/api/coupons/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coupons"] });
      toast.success("Coupon deleted");
    },
    onError: () => toast.error("Failed to delete coupon"),
  });
}

// --- Subscriptions ---

interface SubscriptionListParams {
  page?: number;
  pageSize?: number;
  status?: string;
}

export function useSubscriptions(params: SubscriptionListParams = {}) {
  const { page = 1, pageSize = 20, status } = params;
  return useQuery({
    queryKey: ["subscriptions", { page, pageSize, status }],
    queryFn: async () => {
      const sp = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (status) sp.set("status", status);
      const { data } = await apiClient.get(`/api/subscriptions?${sp}`);
      return data as { data: Subscription[]; meta: { total: number; page: number; page_size: number; pages: number } };
    },
  });
}

export function useSubscription(id: number) {
  return useQuery({
    queryKey: ["subscriptions", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/subscriptions/${id}`);
      return data.data as Subscription;
    },
    enabled: id > 0,
  });
}

export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ subId, immediately }: { subId: number; immediately: boolean }) => {
      const { data } = await apiClient.post(`/api/subscriptions/${subId}/cancel`, { immediately });
      return data.data as Subscription;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscriptions"] });
      qc.invalidateQueries({ queryKey: ["commerce-dashboard"] });
      toast.success("Subscription cancelled");
    },
    onError: () => toast.error("Failed to cancel subscription"),
  });
}
