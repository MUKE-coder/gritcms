"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type {
  Calendar,
  BookingEventType,
  Availability,
  Appointment,
} from "@repo/shared/types";

// --- Calendars ---

export function useCalendars() {
  return useQuery({
    queryKey: ["booking-calendars"],
    queryFn: async () => {
      const { data } = await apiClient.get("/api/booking/calendars");
      return data.data as Calendar[];
    },
  });
}

export function useCalendar(id: number) {
  return useQuery({
    queryKey: ["booking-calendars", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/booking/calendars/${id}`);
      return data.data as Calendar;
    },
    enabled: id > 0,
  });
}

export function useCreateCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<Calendar>) => {
      const { data } = await apiClient.post("/api/booking/calendars", body);
      return data.data as Calendar;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-calendars"] });
      toast.success("Calendar created");
    },
    onError: () => toast.error("Failed to create calendar"),
  });
}

export function useUpdateCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<Calendar> & { id: number }) => {
      const { data } = await apiClient.put(`/api/booking/calendars/${id}`, body);
      return data.data as Calendar;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["booking-calendars"] });
      qc.invalidateQueries({ queryKey: ["booking-calendars", vars.id] });
      toast.success("Calendar updated");
    },
    onError: () => toast.error("Failed to update calendar"),
  });
}

export function useDeleteCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/api/booking/calendars/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-calendars"] });
      toast.success("Calendar deleted");
    },
    onError: () => toast.error("Failed to delete calendar"),
  });
}

// --- Event Types ---

export function useCreateEventType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ calendarId, ...body }: Partial<BookingEventType> & { calendarId: number }) => {
      const { data } = await apiClient.post(`/api/booking/calendars/${calendarId}/event-types`, body);
      return data.data as BookingEventType;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-calendars"] });
      toast.success("Event type created");
    },
    onError: () => toast.error("Failed to create event type"),
  });
}

export function useUpdateEventType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<BookingEventType> & { id: number }) => {
      const { data } = await apiClient.put(`/api/booking/event-types/${id}`, body);
      return data.data as BookingEventType;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-calendars"] });
      toast.success("Event type updated");
    },
    onError: () => toast.error("Failed to update event type"),
  });
}

export function useDeleteEventType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/api/booking/event-types/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-calendars"] });
      toast.success("Event type deleted");
    },
    onError: () => toast.error("Failed to delete event type"),
  });
}

// --- Availability ---

export function useSetAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ calendarId, slots }: { calendarId: number; slots: Partial<Availability>[] }) => {
      const { data } = await apiClient.put(`/api/booking/calendars/${calendarId}/availability`, slots);
      return data.data as Availability[];
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-calendars"] });
      toast.success("Availability updated");
    },
    onError: () => toast.error("Failed to update availability"),
  });
}

// --- Appointments ---

export function useAppointments(page = 1, status = "", upcoming = false) {
  return useQuery({
    queryKey: ["booking-appointments", { page, status, upcoming }],
    queryFn: async () => {
      const sp = new URLSearchParams({ page: String(page) });
      if (status) sp.set("status", status);
      if (upcoming) sp.set("upcoming", "true");
      const { data } = await apiClient.get(`/api/booking/appointments?${sp}`);
      return data as { data: Appointment[]; meta: { total: number; page: number; page_size: number; pages: number } };
    },
  });
}

export function useAppointment(id: number) {
  return useQuery({
    queryKey: ["booking-appointments", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/booking/appointments/${id}`);
      return data.data as Appointment;
    },
    enabled: id > 0,
  });
}

export function useCancelAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.post(`/api/booking/appointments/${id}/cancel`);
      return data.data as Appointment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-appointments"] });
      toast.success("Appointment cancelled");
    },
    onError: () => toast.error("Failed to cancel appointment"),
  });
}

export function useCompleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.post(`/api/booking/appointments/${id}/complete`);
      return data.data as Appointment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-appointments"] });
      toast.success("Appointment marked complete");
    },
    onError: () => toast.error("Failed to complete appointment"),
  });
}

export function useRescheduleAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, start_at }: { id: number; start_at: string }) => {
      const { data } = await apiClient.post(`/api/booking/appointments/${id}/reschedule`, { start_at });
      return data.data as Appointment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking-appointments"] });
      toast.success("Appointment rescheduled");
    },
    onError: () => toast.error("Failed to reschedule appointment"),
  });
}
