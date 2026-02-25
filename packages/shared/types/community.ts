import type { Contact } from "./contact";

// --- Spaces ---

export type SpaceType = "public" | "private" | "paid";

export interface Space {
  id: number;
  tenant_id: number;
  name: string;
  slug: string;
  description: string;
  type: SpaceType;
  product_id: number | null;
  sort_order: number;
  icon: string;
  color: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
  thread_count?: number;
}

// --- Members ---

export type MemberRole = "admin" | "moderator" | "member";

export interface CommunityMember {
  id: number;
  tenant_id: number;
  contact_id: number;
  space_id: number;
  role: MemberRole;
  joined_at: string;
  muted_until: string | null;
  created_at: string;
  contact?: Contact;
}

// --- Threads ---

export type ThreadType = "discussion" | "question" | "announcement";
export type ThreadStatus = "open" | "closed" | "pinned";

export interface Thread {
  id: number;
  tenant_id: number;
  space_id: number;
  author_id: number;
  title: string;
  content: unknown;
  type: ThreadType;
  status: ThreadStatus;
  like_count: number;
  reply_count: number;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
  author?: Contact;
  replies?: ThreadReply[];
}

// --- Replies ---

export interface ThreadReply {
  id: number;
  tenant_id: number;
  thread_id: number;
  author_id: number;
  content: unknown;
  parent_id: number | null;
  like_count: number;
  created_at: string;
  updated_at: string;
  author?: Contact;
  children?: ThreadReply[];
}

// --- Reactions ---

export type ReactionType = "like" | "heart" | "celebrate";

export interface Reaction {
  id: number;
  reactable_type: "thread" | "reply";
  reactable_id: number;
  contact_id: number;
  type: ReactionType;
  created_at: string;
}

// --- Community Events ---

export type CommunityEventType = "virtual" | "in_person";
export type CommunityEventStatus = "upcoming" | "live" | "completed" | "cancelled";

export interface CommunityEvent {
  id: number;
  tenant_id: number;
  space_id: number;
  title: string;
  description: string;
  type: CommunityEventType;
  location: string;
  url: string;
  start_at: string;
  end_at: string;
  max_attendees: number;
  status: CommunityEventStatus;
  created_at: string;
  updated_at: string;
  attendee_count?: number;
  attendees?: EventAttendee[];
}

export interface EventAttendee {
  id: number;
  event_id: number;
  contact_id: number;
  status: "registered" | "attended" | "cancelled";
  created_at: string;
  contact?: Contact;
}
