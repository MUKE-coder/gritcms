export type CalendarStatus = "active" | "inactive";
export type AppointmentStatus = "confirmed" | "cancelled" | "rescheduled" | "completed";

export interface Calendar {
  id: number;
  tenant_id: number;
  name: string;
  slug: string;
  description: string;
  timezone: string;
  status: CalendarStatus;
  created_at: string;
  updated_at: string;
  event_types?: BookingEventType[];
  availabilities?: Availability[];
}

export interface BookingEventType {
  id: number;
  tenant_id: number;
  calendar_id: number;
  name: string;
  slug: string;
  description: string;
  duration_minutes: number;
  buffer_before: number;
  buffer_after: number;
  max_per_day: number;
  price: number;
  product_id: number | null;
  color: string;
  created_at: string;
  updated_at: string;
  calendar?: Calendar;
}

export interface Availability {
  id: number;
  tenant_id: number;
  calendar_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface Appointment {
  id: number;
  tenant_id: number;
  event_type_id: number;
  contact_id: number;
  start_at: string;
  end_at: string;
  status: AppointmentStatus;
  notes: string;
  meeting_url: string;
  google_event_id: string;
  zoom_meeting_id: string;
  created_at: string;
  updated_at: string;
  event_type?: BookingEventType;
  contact?: { id: number; first_name: string; last_name: string; email: string; avatar_url: string };
}
