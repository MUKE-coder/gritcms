"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Users,
  Clock,
  Play,
  FileText,
  Music,
  File,
  Code,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Lock,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { usePublicCourse } from "@/hooks/use-courses";
import { useAuth } from "@/hooks/use-auth";
import { useEnrollCourse, useStudentCourse } from "@/hooks/use-student";
import { useCreateCheckout } from "@/hooks/use-checkout";
import { StripeProvider } from "@/components/stripe-provider";
import { CheckoutForm } from "@/components/checkout-form";
import { LessonPreviewModal } from "@/components/lesson-preview-modal";
import type { Lesson, CheckoutResponse } from "@repo/shared/types";
import { useState } from "react";

const lessonIcons: Record<string, typeof Play> = {
  video: Play,
  text: FileText,
  audio: Music,
  pdf: File,
  embed: Code,
};

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function CourseDetailPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const { data: course, isLoading, error } = usePublicCourse(slug);
  const { user, isAuthenticated } = useAuth();
  const { data: studentCourse } = useStudentCourse(isAuthenticated ? (course?.id ?? 0) : 0);
  const router = useRouter();
  const { mutate: enroll, isPending: enrolling } = useEnrollCourse();
  const { mutate: createCheckout, isPending: checkingOut } = useCreateCheckout();
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null);
  const [checkoutData, setCheckoutData] = useState<CheckoutResponse | null>(null);

  const isEnrolled = !!studentCourse?.enrollment;

  function toggleModule(id: number) {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    if (course?.modules) {
      setExpandedModules(new Set(course.modules.map((m) => m.id)));
    }
  }

  function handleEnroll() {
    if (!course) return;
    if (!isAuthenticated) {
      window.location.href = `/auth/login?redirect=/courses/${slug}`;
      return;
    }

    if (course.access_type === "paid" && course.product_id) {
      createCheckout(
        {
          type: "course",
          course_id: course.id,
          price_id: 0,
        },
        {
          onSuccess: (data) => setCheckoutData(data),
        }
      );
    } else {
      enroll(course.id);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16 animate-pulse">
        <div className="h-4 bg-bg-hover rounded w-24 mb-8" />
        <div className="h-10 bg-bg-hover rounded w-3/4 mb-4" />
        <div className="h-4 bg-bg-hover rounded w-1/3 mb-8" />
        <div className="aspect-[2/1] bg-bg-hover rounded-xl mb-8" />
        <div className="space-y-4">
          <div className="h-4 bg-bg-hover rounded w-full" />
          <div className="h-4 bg-bg-hover rounded w-5/6" />
          <div className="h-4 bg-bg-hover rounded w-4/6" />
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-elevated border border-border">
          <span className="text-2xl text-text-muted">404</span>
        </div>
        <h1 className="text-xl font-semibold text-foreground">Course not found</h1>
        <p className="mt-2 text-sm text-text-muted">
          The course you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Link
          href="/courses"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Courses
        </Link>
      </div>
    );
  }

  const modules = course.modules ?? [];
  const totalLessons = modules.reduce((sum, m) => sum + (m.lessons?.length ?? 0), 0);
  const totalDuration = modules.reduce(
    (sum, m) => sum + (m.lessons?.reduce((s, l) => s + (l.duration_minutes || 0), 0) ?? 0),
    0
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      {/* Back link */}
      <Link
        href="/courses"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        All courses
      </Link>

      {/* Hero */}
      <div className="grid gap-8 lg:grid-cols-[1fr,340px]">
        {/* Left */}
        <div>
          {/* Access badge */}
          <div className="flex items-center gap-2 mb-4">
            {course.access_type === "free" ? (
              <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400">
                Free
              </span>
            ) : course.access_type === "paid" ? (
              <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: course.currency || "USD",
                }).format(course.price / 100)}
              </span>
            ) : (
              <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-400">
                Membership Required
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
            {course.title}
          </h1>

          {course.short_description && (
            <p className="mt-4 text-lg text-text-secondary leading-relaxed">
              {course.short_description}
            </p>
          )}

          {/* Stats */}
          <div className="mt-6 flex flex-wrap items-center gap-5 text-sm text-text-muted">
            {totalLessons > 0 && (
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" />
                {totalLessons} {totalLessons === 1 ? "lesson" : "lessons"}
              </span>
            )}
            {totalDuration > 0 && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {formatDuration(totalDuration)}
              </span>
            )}
            {(course.enrollment_count ?? 0) > 0 && (
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {course.enrollment_count?.toLocaleString()} enrolled
              </span>
            )}
            {modules.length > 0 && (
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4" />
                {modules.length} {modules.length === 1 ? "module" : "modules"}
              </span>
            )}
          </div>

          {/* Instructor */}
          {course.instructor && (
            <div className="mt-6 flex items-center gap-3">
              {course.instructor.avatar ? (
                <img
                  src={course.instructor.avatar}
                  alt={`${course.instructor.first_name} ${course.instructor.last_name}`}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-semibold text-sm">
                  {course.instructor.first_name.charAt(0)}
                  {course.instructor.last_name.charAt(0)}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-foreground">
                  {course.instructor.first_name} {course.instructor.last_name}
                </p>
                <p className="text-xs text-text-muted">Instructor</p>
              </div>
            </div>
          )}
        </div>

        {/* Right - Thumbnail + Enroll CTA */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border overflow-hidden bg-bg-elevated">
            {course.thumbnail ? (
              <img
                src={course.thumbnail}
                alt={course.title}
                className="w-full h-auto object-cover"
              />
            ) : (
              <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-accent/10 to-accent/5">
                <BookOpen className="h-16 w-16 text-accent/20" />
              </div>
            )}
          </div>

          {/* Enroll / Continue CTA */}
          <div className="rounded-xl border border-border bg-bg-elevated p-5 space-y-3">
            {checkoutData ? (
              <StripeProvider
                clientSecret={checkoutData.client_secret}
                publishableKey={checkoutData.publishable_key}
              >
                <CheckoutForm
                  amount={checkoutData.amount}
                  currency={checkoutData.currency}
                  orderId={checkoutData.order_id}
                  onSuccess={() => {
                    toast.success("Payment successful! Enrolling...");
                    router.push(`/learn/${course.slug}`);
                  }}
                  onError={(msg) => {
                    toast.error(msg);
                    setCheckoutData(null);
                  }}
                />
              </StripeProvider>
            ) : isEnrolled ? (
              <Link
                href={`/learn/${course.slug}`}
                className="block w-full rounded-lg bg-accent px-4 py-3 text-center text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
              >
                Continue Learning
              </Link>
            ) : (
              <button
                onClick={handleEnroll}
                disabled={enrolling || checkingOut}
                className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
              >
                {checkingOut
                  ? "Preparing checkout..."
                  : enrolling
                    ? "Enrolling..."
                    : course.access_type === "free"
                      ? "Enroll for Free"
                      : "Enroll Now"}
              </button>
            )}
            {!isAuthenticated && !checkoutData && (
              <p className="text-xs text-text-muted text-center">
                You&apos;ll need to create an account to enroll.
              </p>
            )}
            {course.access_type === "paid" && !isEnrolled && !checkoutData && (
              <p className="text-xs text-text-muted text-center">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: course.currency || "USD",
                }).format(course.price / 100)} &middot; Lifetime access
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {course.description && (
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-foreground mb-4">About this course</h2>
          <div className="text-text-secondary leading-relaxed whitespace-pre-line">
            {course.description}
          </div>
        </div>
      )}

      {/* Curriculum */}
      {modules.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Curriculum</h2>
            <button
              onClick={expandAll}
              className="text-sm text-accent hover:text-accent-hover transition-colors"
            >
              Expand all
            </button>
          </div>

          <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
            {modules
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((mod) => {
                const isExpanded = expandedModules.has(mod.id);
                const lessons = (mod.lessons ?? []).sort((a, b) => a.sort_order - b.sort_order);
                const modDuration = lessons.reduce((s, l) => s + (l.duration_minutes || 0), 0);

                return (
                  <div key={mod.id}>
                    {/* Module header */}
                    <button
                      onClick={() => toggleModule(mod.id)}
                      className="w-full flex items-center gap-3 px-5 py-4 bg-bg-elevated hover:bg-bg-hover transition-colors text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-text-muted shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-text-muted shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground">{mod.title}</h3>
                        {mod.description && (
                          <p className="text-xs text-text-muted mt-0.5 line-clamp-1">
                            {mod.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-text-muted shrink-0">
                        <span>
                          {lessons.length} {lessons.length === 1 ? "lesson" : "lessons"}
                        </span>
                        {modDuration > 0 && <span>{formatDuration(modDuration)}</span>}
                      </div>
                    </button>

                    {/* Lessons */}
                    {isExpanded && lessons.length > 0 && (
                      <div className="divide-y divide-border/50">
                        {lessons.map((lesson) => {
                          const LessonIcon = lessonIcons[lesson.type] || FileText;
                          const isFreePreview = lesson.is_free_preview;

                          return (
                            <div
                              key={lesson.id}
                              onClick={() => isFreePreview ? setPreviewLesson(lesson) : undefined}
                              className={`flex items-center gap-3 px-5 py-3 pl-12 transition-colors ${
                                isFreePreview
                                  ? "cursor-pointer hover:bg-accent/5"
                                  : "hover:bg-bg-hover/50"
                              }`}
                            >
                              <LessonIcon className={`h-4 w-4 shrink-0 ${isFreePreview ? "text-accent" : "text-text-muted"}`} />
                              <span className="flex-1 text-sm text-foreground truncate">
                                {lesson.title}
                              </span>
                              <div className="flex items-center gap-2 shrink-0">
                                {isFreePreview ? (
                                  <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400 flex items-center gap-1">
                                    <Eye className="h-3 w-3" />
                                    Preview
                                  </span>
                                ) : (
                                  <Lock className="h-3.5 w-3.5 text-text-muted" />
                                )}
                                {lesson.duration_minutes > 0 && (
                                  <span className="text-xs text-text-muted">
                                    {formatDuration(lesson.duration_minutes)}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <div className="mt-12 pt-8 border-t border-border/50">
        <Link
          href="/courses"
          className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover transition-colors font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          All courses
        </Link>
      </div>

      {/* Free preview modal */}
      {previewLesson && (
        <LessonPreviewModal
          lesson={previewLesson}
          open={!!previewLesson}
          onClose={() => setPreviewLesson(null)}
        />
      )}
    </div>
  );
}
