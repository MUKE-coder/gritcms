"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { BookingEventType, Appointment } from "@repo/shared/types";

export function usePublicEventType(slug: string) {
  return useQuery({
    queryKey: ["public-event-type", slug],
    queryFn: async () => {
      const { data } = await api.get(`/api/book/${slug}`);
      return data.data as BookingEventType;
    },
    enabled: !!slug,
  });
}

export function useAvailableSlots(slug: string, date: string) {
  return useQuery({
    queryKey: ["public-slots", slug, date],
    queryFn: async () => {
      const { data } = await api.get(`/api/book/${slug}/slots?date=${date}`);
      return data.data as string[];
    },
    enabled: !!slug && !!date,
  });
}

export function useBookAppointment() {
  return useMutation({
    mutationFn: async ({
      slug,
      ...body
    }: {
      slug: string;
      start_at: string;
      name: string;
      email: string;
      notes?: string;
    }) => {
      const { data } = await api.post(`/api/book/${slug}`, body);
      return data.data as Appointment;
    },
  });
}
