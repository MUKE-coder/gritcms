import type { Contact } from "./contact";

// --- Courses ---

export type CourseStatus = "draft" | "published" | "archived";
export type CourseAccessType = "free" | "paid" | "membership";

export interface Course {
  id: number;
  tenant_id: number;
  title: string;
  slug: string;
  description: string;
  short_description: string;
  thumbnail: string;
  price: number;
  currency: string;
  status: CourseStatus;
  access_type: CourseAccessType;
  product_id: number | null;
  instructor_id: number | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  modules?: CourseModule[];
  instructor?: { id: number; first_name: string; last_name: string; avatar: string };
  enrollment_count?: number;
}

// --- Course Modules ---

export interface CourseModule {
  id: number;
  tenant_id: number;
  course_id: number;
  title: string;
  description: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  lessons?: Lesson[];
}

// --- Lessons ---

export type LessonType = "video" | "text" | "audio" | "pdf" | "embed";

export interface Lesson {
  id: number;
  tenant_id: number;
  module_id: number;
  title: string;
  slug: string;
  content: unknown;
  type: LessonType;
  video_url: string;
  duration_minutes: number;
  sort_order: number;
  is_free_preview: boolean;
  drip_delay_days: number;
  created_at: string;
  updated_at: string;
  quizzes?: Quiz[];
}

// --- Enrollments ---

export type EnrollStatus = "active" | "completed" | "expired" | "suspended";

export interface CourseEnrollment {
  id: number;
  tenant_id: number;
  contact_id: number;
  course_id: number;
  status: EnrollStatus;
  enrolled_at: string;
  completed_at: string | null;
  progress_percentage: number;
  source: string;
  created_at: string;
  updated_at: string;
  contact?: Contact;
  course?: Course;
  lesson_progresses?: LessonProgress[];
}

// --- Lesson Progress ---

export type ProgressStatus = "not_started" | "in_progress" | "completed";

export interface LessonProgress {
  id: number;
  tenant_id: number;
  enrollment_id: number;
  lesson_id: number;
  status: ProgressStatus;
  started_at: string | null;
  completed_at: string | null;
  time_spent_seconds: number;
  created_at: string;
  updated_at: string;
  lesson?: Lesson;
}

// --- Quizzes ---

export interface Quiz {
  id: number;
  tenant_id: number;
  lesson_id: number;
  title: string;
  description: string;
  passing_score: number;
  max_attempts: number;
  show_correct_answers: boolean;
  created_at: string;
  updated_at: string;
  questions?: QuizQuestion[];
}

export type QuestionType = "multiple_choice" | "true_false" | "short_answer";

export interface QuizQuestion {
  id: number;
  tenant_id: number;
  quiz_id: number;
  question: string;
  type: QuestionType;
  options: Array<{ label: string; value: string }> | null;
  correct_answer: string;
  explanation: string;
  sort_order: number;
  points: number;
  created_at: string;
  updated_at: string;
}

export interface QuizAttempt {
  id: number;
  tenant_id: number;
  quiz_id: number;
  enrollment_id: number;
  answers: Array<{ question_id: number; answer: string }> | null;
  score: number;
  passed: boolean;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

// --- Certificates ---

export interface Certificate {
  id: number;
  tenant_id: number;
  course_id: number;
  enrollment_id: number;
  contact_id: number;
  certificate_number: string;
  issued_at: string;
  template: string;
  created_at: string;
  course?: Course;
  contact?: Contact;
}

// --- Course Analytics ---

export interface CourseAnalytics {
  total_enrollments: number;
  completed_enrollments: number;
  completion_rate: number;
  avg_progress: number;
}
