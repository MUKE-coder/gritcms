"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Users, BookOpen, DollarSign } from "lucide-react";
import { usePublicCourses } from "@/hooks/use-courses";

export default function CourseCatalogPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePublicCourses({ page, pageSize: 12 });
  const courses = data?.courses || [];
  const meta = data?.meta;

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Courses</h1>
        <p className="mt-3 text-lg text-text-secondary max-w-2xl mx-auto">
          Learn at your own pace with our comprehensive courses designed to help you grow.
        </p>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-bg-elevated overflow-hidden animate-pulse">
              <div className="h-48 bg-bg-hover" />
              <div className="p-5 space-y-3">
                <div className="h-3 bg-bg-hover rounded w-1/4" />
                <div className="h-5 bg-bg-hover rounded w-3/4" />
                <div className="h-3 bg-bg-hover rounded w-full" />
                <div className="h-3 bg-bg-hover rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : courses.length > 0 ? (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => {
              const moduleCount = course.modules?.length ?? 0;
              const lessonCount = course.modules?.reduce((sum, m) => sum + (m.lessons?.length ?? 0), 0) ?? 0;

              return (
                <Link
                  key={course.id}
                  href={`/courses/${course.slug}`}
                  className="group rounded-xl border border-border bg-bg-elevated overflow-hidden hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300"
                >
                  {/* Thumbnail */}
                  <div className="h-48 bg-bg-hover overflow-hidden">
                    {course.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-accent/10 to-accent/5">
                        <BookOpen className="h-12 w-12 text-accent/20" />
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    {/* Access / Price badge */}
                    <div className="flex items-center gap-2 mb-3">
                      {course.access_type === "free" ? (
                        <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
                          Free
                        </span>
                      ) : course.access_type === "paid" ? (
                        <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: course.currency || "USD",
                          }).format(course.price / 100)}
                        </span>
                      ) : (
                        <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-medium text-purple-400">
                          Membership
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h2 className="font-semibold text-lg text-foreground group-hover:text-accent transition-colors line-clamp-2 leading-snug">
                      {course.title}
                    </h2>

                    {/* Description */}
                    {course.short_description && (
                      <p className="mt-2 text-sm text-text-secondary line-clamp-2 leading-relaxed">
                        {course.short_description}
                      </p>
                    )}

                    {/* Meta */}
                    <div className="mt-4 flex items-center gap-4 text-xs text-text-muted">
                      {moduleCount > 0 && (
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5" />
                          {lessonCount} {lessonCount === 1 ? "lesson" : "lessons"}
                        </span>
                      )}
                      {(course.enrollment_count ?? 0) > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {course.enrollment_count?.toLocaleString()} enrolled
                        </span>
                      )}
                    </div>

                    <span className="mt-4 inline-block text-xs font-medium text-accent group-hover:text-accent-hover transition-colors">
                      View course &rarr;
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {meta && meta.pages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <div className="flex items-center gap-1 px-3">
                {Array.from({ length: meta.pages }).map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setPage(i + 1)}
                    className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                      page === i + 1
                        ? "bg-accent text-white"
                        : "text-text-secondary hover:bg-bg-hover hover:text-foreground"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
                disabled={page >= meta.pages}
                className="flex items-center gap-1 rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-elevated border border-border">
            <BookOpen className="h-8 w-8 text-text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No courses available</h3>
          <p className="mt-1 text-sm text-text-muted">
            Check back soon for new courses.
          </p>
        </div>
      )}
    </div>
  );
}
