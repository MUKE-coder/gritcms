"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type {
  Course,
  CourseModule,
  Lesson,
  CourseEnrollment,
  LessonProgress,
  Quiz,
  QuizQuestion,
  QuizAttempt,
  Certificate,
  CourseAnalytics,
  CourseDashboard,
  Contact,
} from "@repo/shared/types";

// --- Course Dashboard ---

export function useCourseDashboard() {
  return useQuery({
    queryKey: ["courses-dashboard"],
    queryFn: async () => {
      const { data } = await apiClient.get("/api/courses/dashboard");
      return data.data as CourseDashboard;
    },
  });
}

// --- Courses ---

interface CourseListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}

export function useCourses(params: CourseListParams = {}) {
  const { page = 1, pageSize = 20, status, search } = params;
  return useQuery({
    queryKey: ["courses", { page, pageSize, status, search }],
    queryFn: async () => {
      const sp = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (status) sp.set("status", status);
      if (search) sp.set("search", search);
      const { data } = await apiClient.get(`/api/courses?${sp}`);
      return data as { data: Course[]; meta: { total: number; page: number; page_size: number; pages: number } };
    },
  });
}

export function useCourse(id: number) {
  return useQuery({
    queryKey: ["courses", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/courses/${id}`);
      return data.data as Course;
    },
    enabled: id > 0,
  });
}

export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<Course>) => {
      const { data } = await apiClient.post("/api/courses", body);
      return data.data as Course;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courses"] });
      toast.success("Course created");
    },
    onError: () => toast.error("Failed to create course"),
  });
}

export function useUpdateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<Course> & { id: number }) => {
      const { data } = await apiClient.put(`/api/courses/${id}`, body);
      return data.data as Course;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["courses"] });
      qc.invalidateQueries({ queryKey: ["courses", vars.id] });
      toast.success("Course updated");
    },
    onError: () => toast.error("Failed to update course"),
  });
}

export function useDeleteCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/api/courses/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courses"] });
      toast.success("Course deleted");
    },
    onError: () => toast.error("Failed to delete course"),
  });
}

export function useDuplicateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.post(`/api/courses/${id}/duplicate`);
      return data.data as Course;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courses"] });
      toast.success("Course duplicated");
    },
    onError: () => toast.error("Failed to duplicate course"),
  });
}

export function usePublishCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const { data } = await apiClient.post(`/api/courses/${id}/publish`, { status });
      return data.data as Course;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["courses"] });
      qc.invalidateQueries({ queryKey: ["courses", vars.id] });
      toast.success("Course status updated");
    },
    onError: () => toast.error("Failed to update course status"),
  });
}

export function useCourseAnalytics(id: number) {
  return useQuery({
    queryKey: ["courses", id, "analytics"],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/courses/${id}/analytics`);
      return data.data as CourseAnalytics;
    },
    enabled: id > 0,
  });
}

// --- Modules ---

export function useCreateModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, ...body }: Partial<CourseModule> & { courseId: number }) => {
      const { data } = await apiClient.post(`/api/courses/${courseId}/modules`, body);
      return data.data as CourseModule;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["courses", vars.courseId] });
      toast.success("Module created");
    },
    onError: () => toast.error("Failed to create module"),
  });
}

export function useUpdateModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, modId, ...body }: Partial<CourseModule> & { courseId: number; modId: number }) => {
      const { data } = await apiClient.put(`/api/courses/${courseId}/modules/${modId}`, body);
      return data.data as CourseModule;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["courses", vars.courseId] });
      toast.success("Module updated");
    },
    onError: () => toast.error("Failed to update module"),
  });
}

export function useDeleteModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, modId }: { courseId: number; modId: number }) => {
      await apiClient.delete(`/api/courses/${courseId}/modules/${modId}`);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["courses", vars.courseId] });
      toast.success("Module deleted");
    },
    onError: () => toast.error("Failed to delete module"),
  });
}

export function useReorderModules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, ids }: { courseId: number; ids: number[] }) => {
      await apiClient.put(`/api/courses/${courseId}/modules/reorder`, { ids });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["courses", vars.courseId] });
    },
    onError: () => toast.error("Failed to reorder modules"),
  });
}

// --- Lessons ---

export function useCreateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, modId, ...body }: Partial<Lesson> & { courseId: number; modId: number }) => {
      const { data } = await apiClient.post(`/api/courses/${courseId}/modules/${modId}/lessons`, body);
      return data.data as Lesson;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["courses", vars.courseId] });
      toast.success("Lesson created");
    },
    onError: () => toast.error("Failed to create lesson"),
  });
}

export function useLesson(courseId: number, lessonId: number) {
  return useQuery({
    queryKey: ["courses", courseId, "lessons", lessonId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/courses/${courseId}/lessons/${lessonId}`);
      return data.data as Lesson;
    },
    enabled: courseId > 0 && lessonId > 0,
  });
}

export function useUpdateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, lessonId, ...body }: Partial<Lesson> & { courseId: number; lessonId: number }) => {
      const { data } = await apiClient.put(`/api/courses/${courseId}/lessons/${lessonId}`, body);
      return data.data as Lesson;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["courses", vars.courseId] });
      qc.invalidateQueries({ queryKey: ["courses", vars.courseId, "lessons", vars.lessonId] });
      toast.success("Lesson updated");
    },
    onError: () => toast.error("Failed to update lesson"),
  });
}

export function useDeleteLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, lessonId }: { courseId: number; lessonId: number }) => {
      await apiClient.delete(`/api/courses/${courseId}/lessons/${lessonId}`);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["courses", vars.courseId] });
      toast.success("Lesson deleted");
    },
    onError: () => toast.error("Failed to delete lesson"),
  });
}

export function useReorderLessons() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, modId, ids }: { courseId: number; modId: number; ids: number[] }) => {
      await apiClient.put(`/api/courses/${courseId}/modules/${modId}/lessons/reorder`, { ids });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["courses", vars.courseId] });
    },
    onError: () => toast.error("Failed to reorder lessons"),
  });
}

// --- Enrollments ---

export function useEnrollInCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, contactId, source }: { courseId: number; contactId: number; source?: string }) => {
      const { data } = await apiClient.post(`/api/courses/${courseId}/enroll`, { contact_id: contactId, source });
      return data.data as CourseEnrollment;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["courses", vars.courseId, "enrollments"] });
      qc.invalidateQueries({ queryKey: ["courses", vars.courseId, "analytics"] });
      toast.success("Contact enrolled");
    },
    onError: () => toast.error("Failed to enroll contact"),
  });
}

interface EnrollmentListParams {
  courseId: number;
  page?: number;
  pageSize?: number;
  status?: string;
}

export function useCourseEnrollments(params: EnrollmentListParams) {
  const { courseId, page = 1, pageSize = 20, status } = params;
  return useQuery({
    queryKey: ["courses", courseId, "enrollments", { page, pageSize, status }],
    queryFn: async () => {
      const sp = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (status) sp.set("status", status);
      const { data } = await apiClient.get(`/api/courses/${courseId}/enrollments?${sp}`);
      return data as { data: CourseEnrollment[]; meta: { total: number; page: number; page_size: number; pages: number } };
    },
    enabled: courseId > 0,
  });
}

export function useUnenrollContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, enrollId }: { courseId: number; enrollId: number }) => {
      await apiClient.delete(`/api/courses/${courseId}/enrollments/${enrollId}`);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["courses", vars.courseId, "enrollments"] });
      qc.invalidateQueries({ queryKey: ["courses", vars.courseId, "analytics"] });
      toast.success("Contact unenrolled");
    },
    onError: () => toast.error("Failed to unenroll contact"),
  });
}

// --- Progress ---

export function useMarkLessonComplete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ enrollmentId, lessonId }: { enrollmentId: number; lessonId: number }) => {
      const { data } = await apiClient.post("/api/courses/progress/complete", {
        enrollment_id: enrollmentId,
        lesson_id: lessonId,
      });
      return data.data as LessonProgress;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courses"] });
      toast.success("Lesson marked complete");
    },
    onError: () => toast.error("Failed to mark lesson complete"),
  });
}

export function useEnrollmentProgress(enrollId: number) {
  return useQuery({
    queryKey: ["courses", "enrollments", enrollId, "progress"],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/courses/enrollments/${enrollId}/progress`);
      return data.data as LessonProgress[];
    },
    enabled: enrollId > 0,
  });
}

// --- Quizzes ---

export function useCreateQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, lessonId, ...body }: Partial<Quiz> & { courseId: number; lessonId: number }) => {
      const { data } = await apiClient.post(`/api/courses/${courseId}/lessons/${lessonId}/quizzes`, body);
      return data.data as Quiz;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["courses", vars.courseId] });
      toast.success("Quiz created");
    },
    onError: () => toast.error("Failed to create quiz"),
  });
}

export function useUpdateQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, quizId, ...body }: Partial<Quiz> & { courseId: number; quizId: number }) => {
      const { data } = await apiClient.put(`/api/courses/${courseId}/quizzes/${quizId}`, body);
      return data.data as Quiz;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["courses", vars.courseId] });
      toast.success("Quiz updated");
    },
    onError: () => toast.error("Failed to update quiz"),
  });
}

export function useDeleteQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, quizId }: { courseId: number; quizId: number }) => {
      await apiClient.delete(`/api/courses/${courseId}/quizzes/${quizId}`);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["courses", vars.courseId] });
      toast.success("Quiz deleted");
    },
    onError: () => toast.error("Failed to delete quiz"),
  });
}

// --- Quiz Questions ---

export function useCreateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, quizId, ...body }: Partial<QuizQuestion> & { courseId: number; quizId: number }) => {
      const { data } = await apiClient.post(`/api/courses/${courseId}/quizzes/${quizId}/questions`, body);
      return data.data as QuizQuestion;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["courses", vars.courseId] });
      toast.success("Question added");
    },
    onError: () => toast.error("Failed to add question"),
  });
}

export function useUpdateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      courseId, quizId, qId, ...body
    }: Partial<QuizQuestion> & { courseId: number; quizId: number; qId: number }) => {
      const { data } = await apiClient.put(`/api/courses/${courseId}/quizzes/${quizId}/questions/${qId}`, body);
      return data.data as QuizQuestion;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["courses", vars.courseId] });
      toast.success("Question updated");
    },
    onError: () => toast.error("Failed to update question"),
  });
}

export function useDeleteQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, quizId, qId }: { courseId: number; quizId: number; qId: number }) => {
      await apiClient.delete(`/api/courses/${courseId}/quizzes/${quizId}/questions/${qId}`);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["courses", vars.courseId] });
      toast.success("Question deleted");
    },
    onError: () => toast.error("Failed to delete question"),
  });
}

// --- Quiz Attempts ---

export function useSubmitQuizAttempt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      courseId, quizId, ...body
    }: { courseId: number; quizId: number; enrollment_id: number; answers: Array<{ question_id: number; answer: string }> }) => {
      const { data } = await apiClient.post(`/api/courses/${courseId}/quizzes/${quizId}/attempt`, body);
      return data.data as QuizAttempt;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["courses", vars.courseId] });
      toast.success("Quiz submitted");
    },
    onError: () => toast.error("Failed to submit quiz"),
  });
}

export function useQuizAttempts(courseId: number, quizId: number) {
  return useQuery({
    queryKey: ["courses", courseId, "quizzes", quizId, "attempts"],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/courses/${courseId}/quizzes/${quizId}/attempts`);
      return data.data as QuizAttempt[];
    },
    enabled: courseId > 0 && quizId > 0,
  });
}

// --- Certificates ---

export function useCertificates() {
  return useQuery({
    queryKey: ["certificates"],
    queryFn: async () => {
      const { data } = await apiClient.get("/api/certificates");
      return data.data as Certificate[];
    },
  });
}
