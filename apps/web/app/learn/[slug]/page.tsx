"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useMemo } from "react";
import {
  ArrowLeft,
  BookOpen,
  Play,
  FileText,
  Music,
  File,
  Code,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { usePublicCourse } from "@/hooks/use-courses";
import { useStudentCourse, useMarkLessonComplete } from "@/hooks/use-student";
import type { Lesson } from "@repo/shared/types";

const lessonIcons: Record<string, typeof Play> = {
  video: Play,
  text: FileText,
  audio: Music,
  pdf: File,
  embed: Code,
};

function isYouTube(url: string) {
  return /youtube\.com|youtu\.be/.test(url);
}
function isVimeo(url: string) {
  return /vimeo\.com/.test(url);
}
function getYouTubeId(url: string) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
  return m ? m[1] : "";
}
function getVimeoId(url: string) {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : "";
}

export default function LearnPage() {
  const params = useParams();
  const router = useRouter();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: course, isLoading: courseLoading } = usePublicCourse(slug);
  const { data: studentData, isLoading: studentLoading } = useStudentCourse(course?.id ?? 0);
  const { mutate: markComplete, isPending: marking } = useMarkLessonComplete();

  const [activeLessonId, setActiveLessonId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());

  // Flatten all lessons in order
  const allLessons = useMemo(() => {
    if (!course?.modules) return [];
    return course.modules
      .sort((a, b) => a.sort_order - b.sort_order)
      .flatMap((m) => (m.lessons ?? []).sort((a, b) => a.sort_order - b.sort_order));
  }, [course]);

  // Set first lesson as active by default
  const activeLesson = allLessons.find((l) => l.id === activeLessonId) || allLessons[0] || null;
  const activeIndex = activeLesson ? allLessons.findIndex((l) => l.id === activeLesson.id) : -1;

  // Completed lesson IDs
  const completedIds = useMemo(() => {
    const set = new Set<number>();
    studentData?.lesson_progresses?.forEach((p) => {
      if (p.status === "completed") set.add(p.lesson_id);
    });
    return set;
  }, [studentData]);

  // Expand all modules by default once course loads
  useMemo(() => {
    if (course?.modules && expandedModules.size === 0) {
      setExpandedModules(new Set(course.modules.map((m) => m.id)));
    }
  }, [course?.modules]);

  const progress = studentData?.enrollment?.progress_percentage ?? 0;

  function toggleModule(id: number) {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleMarkComplete() {
    if (!course || !activeLesson) return;
    markComplete({ courseId: course.id, lessonId: activeLesson.id });
  }

  function goToLesson(direction: "prev" | "next") {
    const idx = direction === "prev" ? activeIndex - 1 : activeIndex + 1;
    if (idx >= 0 && idx < allLessons.length) {
      setActiveLessonId(allLessons[idx].id);
    }
  }

  // Loading state
  if (authLoading || courseLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-pulse text-text-muted">Loading...</div>
      </div>
    );
  }

  // Redirect if not logged in
  if (!isAuthenticated) {
    router.push(`/auth/login?redirect=/learn/${slug}`);
    return null;
  }

  // Course not found
  if (!course) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Course not found</h1>
          <Link href="/courses" className="mt-4 inline-flex items-center gap-2 text-accent hover:text-accent-hover text-sm">
            <ArrowLeft className="h-4 w-4" /> Back to courses
          </Link>
        </div>
      </div>
    );
  }

  // Not enrolled
  if (!studentData?.enrollment) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold">You&apos;re not enrolled in this course</h1>
          <Link
            href={`/courses/${slug}`}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
          >
            Enroll Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      {sidebarOpen && (
        <aside className="w-80 shrink-0 border-r border-border bg-bg-secondary overflow-y-auto">
          {/* Course header */}
          <div className="sticky top-0 bg-bg-secondary border-b border-border p-4">
            <Link
              href={`/courses/${slug}`}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-foreground transition-colors mb-2"
            >
              <ArrowLeft className="h-3 w-3" />
              Course details
            </Link>
            <h2 className="font-semibold text-sm text-foreground line-clamp-2">{course.title}</h2>
            {/* Progress bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                <span>{Math.round(progress)}% complete</span>
                <span>
                  {completedIds.size}/{allLessons.length} lessons
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-bg-hover overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Module list */}
          <div className="divide-y divide-border/50">
            {(course.modules ?? [])
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((mod) => {
                const isExpanded = expandedModules.has(mod.id);
                const lessons = (mod.lessons ?? []).sort((a, b) => a.sort_order - b.sort_order);

                return (
                  <div key={mod.id}>
                    <button
                      onClick={() => toggleModule(mod.id)}
                      className="w-full flex items-center gap-2 px-4 py-3 hover:bg-bg-hover transition-colors text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-text-muted shrink-0" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-text-muted shrink-0" />
                      )}
                      <span className="text-xs font-semibold text-foreground flex-1 truncate">
                        {mod.title}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        {lessons.filter((l) => completedIds.has(l.id)).length}/{lessons.length}
                      </span>
                    </button>

                    {isExpanded && (
                      <div>
                        {lessons.map((lesson) => {
                          const LIcon = lessonIcons[lesson.type] || FileText;
                          const isActive = lesson.id === activeLesson?.id;
                          const isDone = completedIds.has(lesson.id);

                          return (
                            <button
                              key={lesson.id}
                              onClick={() => setActiveLessonId(lesson.id)}
                              className={`w-full flex items-center gap-2.5 px-4 pl-9 py-2.5 text-left transition-colors ${
                                isActive
                                  ? "bg-accent/10 border-l-2 border-accent"
                                  : "hover:bg-bg-hover border-l-2 border-transparent"
                              }`}
                            >
                              {isDone ? (
                                <CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0" />
                              ) : (
                                <LIcon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-accent" : "text-text-muted"}`} />
                              )}
                              <span
                                className={`text-xs flex-1 truncate ${
                                  isActive ? "text-accent font-medium" : "text-foreground"
                                }`}
                              >
                                {lesson.title}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </aside>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {/* Toggle sidebar button */}
        <div className="sticky top-0 z-10 flex items-center gap-3 bg-bg-primary/80 backdrop-blur-lg border-b border-border px-4 py-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-md hover:bg-bg-hover text-text-muted hover:text-foreground transition-colors"
            title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          >
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
          </button>
          {activeLesson && (
            <h3 className="text-sm font-medium text-foreground truncate flex-1">
              {activeLesson.title}
            </h3>
          )}
        </div>

        {activeLesson ? (
          <div className="max-w-4xl mx-auto px-6 py-8">
            {/* Video player */}
            {activeLesson.type === "video" && !!activeLesson.video_url && (
              <div className="aspect-video rounded-xl overflow-hidden bg-black mb-8">
                {isYouTube(activeLesson.video_url) ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${getYouTubeId(activeLesson.video_url)}?rel=0`}
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                ) : isVimeo(activeLesson.video_url) ? (
                  <iframe
                    src={`https://player.vimeo.com/video/${getVimeoId(activeLesson.video_url)}`}
                    className="w-full h-full"
                    allowFullScreen
                    allow="autoplay; fullscreen; picture-in-picture"
                  />
                ) : (
                  <video
                    src={activeLesson.video_url}
                    controls
                    className="w-full h-full"
                  />
                )}
              </div>
            )}

            {/* Text content */}
            {activeLesson.type === "text" && !!activeLesson.content && (
              <div
                className="prose prose-invert max-w-none mb-8"
                dangerouslySetInnerHTML={{
                  __html: typeof activeLesson.content === "string"
                    ? activeLesson.content
                    : JSON.stringify(activeLesson.content),
                }}
              />
            )}

            {/* Audio player */}
            {activeLesson.type === "audio" && !!activeLesson.video_url && (
              <div className="mb-8 p-6 rounded-xl bg-bg-elevated border border-border">
                <audio src={activeLesson.video_url} controls className="w-full" />
              </div>
            )}

            {/* PDF embed */}
            {activeLesson.type === "pdf" && !!activeLesson.video_url && (
              <div className="aspect-[3/4] rounded-xl overflow-hidden border border-border mb-8">
                <iframe src={activeLesson.video_url} className="w-full h-full" />
              </div>
            )}

            {/* Embed */}
            {activeLesson.type === "embed" && !!activeLesson.video_url && (
              <div className="aspect-video rounded-xl overflow-hidden border border-border mb-8">
                <iframe src={activeLesson.video_url} className="w-full h-full" allowFullScreen />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-border">
              <button
                onClick={() => goToLesson("prev")}
                disabled={activeIndex <= 0}
                className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              {!completedIds.has(activeLesson.id) ? (
                <button
                  onClick={handleMarkComplete}
                  disabled={marking}
                  className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
                >
                  {marking ? "Saving..." : "Mark as Complete"}
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm text-green-400 font-medium">
                  <CheckCircle className="h-4 w-4" />
                  Completed
                </span>
              )}

              <button
                onClick={() => goToLesson("next")}
                disabled={activeIndex >= allLessons.length - 1}
                className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-text-muted">Select a lesson to begin</p>
          </div>
        )}
      </div>
    </div>
  );
}
