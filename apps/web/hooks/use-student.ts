"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Course, CourseEnrollment, LessonProgress } from "@repo/shared/types";

interface StudentCourseData {
  course: Course;
  enrollment: CourseEnrollment;
  lesson_progresses: LessonProgress[];
}

export function useStudentCourses() {
  return useQuery({
    queryKey: ["student-courses"],
    queryFn: async () => {
      const { data } = await api.get("/api/student/courses");
      return data.data as StudentCourseData[];
    },
  });
}

export function useStudentCourse(courseId: number) {
  return useQuery({
    queryKey: ["student-course", courseId],
    queryFn: async () => {
      const { data } = await api.get(`/api/student/courses/${courseId}`);
      return data.data as StudentCourseData;
    },
    enabled: courseId > 0,
  });
}

export function useEnrollCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (courseId: number) => {
      const { data } = await api.post(`/api/student/courses/${courseId}/enroll`);
      return data.data as CourseEnrollment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-courses"] });
      qc.invalidateQueries({ queryKey: ["student-course"] });
    },
  });
}

export function useMarkLessonComplete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, lessonId }: { courseId: number; lessonId: number }) => {
      const { data } = await api.post(`/api/student/courses/${courseId}/lessons/${lessonId}/complete`);
      return data.data as LessonProgress;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["student-course", vars.courseId] });
      qc.invalidateQueries({ queryKey: ["student-courses"] });
    },
  });
}
