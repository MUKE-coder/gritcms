"use client";

import { X } from "lucide-react";
import type { Lesson } from "@repo/shared/types";

function getVideoEmbed(url: string): { type: "iframe" | "video"; src: string } {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return { type: "iframe", src: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1` };

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return { type: "iframe", src: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1` };

  // Direct video URL
  return { type: "video", src: url };
}

interface LessonPreviewModalProps {
  lesson: Lesson;
  open: boolean;
  onClose: () => void;
}

export function LessonPreviewModal({ lesson, open, onClose }: LessonPreviewModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-4xl mx-4 rounded-xl border border-border bg-bg-elevated overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div>
            <p className="text-xs text-accent font-medium">Free Preview</p>
            <h3 className="text-sm font-semibold text-foreground">{lesson.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="bg-black">
          {lesson.type === "video" && lesson.video_url ? (
            (() => {
              const embed = getVideoEmbed(lesson.video_url);
              if (embed.type === "iframe") {
                return (
                  <div className="aspect-video">
                    <iframe
                      src={embed.src}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                );
              }
              return (
                <div className="aspect-video">
                  <video
                    src={embed.src}
                    controls
                    autoPlay
                    className="h-full w-full"
                  />
                </div>
              );
            })()
          ) : lesson.type === "text" && lesson.content ? (
            <div className="p-6 bg-bg-elevated max-h-[70vh] overflow-y-auto">
              <div
                className="prose-blog"
                dangerouslySetInnerHTML={{
                  __html: typeof lesson.content === "string"
                    ? lesson.content
                    : (lesson.content as { html?: string })?.html || JSON.stringify(lesson.content),
                }}
              />
            </div>
          ) : (
            <div className="aspect-video flex items-center justify-center text-text-muted">
              <p>Preview not available for this lesson type.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
