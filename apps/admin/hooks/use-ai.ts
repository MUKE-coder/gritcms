"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

interface AIResponse {
  content: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

// General AI completion
export function useAIComplete() {
  return useMutation({
    mutationFn: async ({ prompt, maxTokens = 1000, temperature = 0.7 }: { prompt: string; maxTokens?: number; temperature?: number }) => {
      const { data } = await apiClient.post("/api/ai/complete", {
        prompt,
        max_tokens: maxTokens,
        temperature,
      });
      return data.data as AIResponse;
    },
  });
}

// Chat-style AI conversation
export function useAIChat() {
  return useMutation({
    mutationFn: async ({ messages, maxTokens = 2000, temperature = 0.7 }: {
      messages: { role: string; content: string }[];
      maxTokens?: number;
      temperature?: number;
    }) => {
      const { data } = await apiClient.post("/api/ai/chat", {
        messages,
        max_tokens: maxTokens,
        temperature,
      });
      return data.data as AIResponse;
    },
  });
}

// Specialized AI helpers built on top of the complete endpoint

export function useGenerateBlogOutline() {
  return useMutation({
    mutationFn: async (topic: string) => {
      const { data } = await apiClient.post("/api/ai/complete", {
        prompt: `Generate a detailed blog post outline for the following topic. Include a compelling title, introduction hook, 5-7 main sections with subsections, and a conclusion. Format in markdown.\n\nTopic: ${topic}`,
        max_tokens: 1500,
        temperature: 0.7,
      });
      return data.data as AIResponse;
    },
  });
}

export function useGenerateEmailSubject() {
  return useMutation({
    mutationFn: async ({ topic, tone = "professional" }: { topic: string; tone?: string }) => {
      const { data } = await apiClient.post("/api/ai/complete", {
        prompt: `Generate 5 compelling email subject lines for the following context. The tone should be ${tone}. Return them as a numbered list.\n\nContext: ${topic}`,
        max_tokens: 500,
        temperature: 0.8,
      });
      return data.data as AIResponse;
    },
  });
}

export function useGenerateSEODescription() {
  return useMutation({
    mutationFn: async ({ title, content }: { title: string; content: string }) => {
      const { data } = await apiClient.post("/api/ai/complete", {
        prompt: `Write an SEO-optimized meta description (150-160 characters) for the following page.\n\nTitle: ${title}\nContent summary: ${content}`,
        max_tokens: 200,
        temperature: 0.5,
      });
      return data.data as AIResponse;
    },
  });
}

export function useGenerateCourseSummary() {
  return useMutation({
    mutationFn: async ({ title, modules }: { title: string; modules: string }) => {
      const { data } = await apiClient.post("/api/ai/complete", {
        prompt: `Write a compelling course description and summary for the following online course. Include key benefits and what students will learn.\n\nCourse: ${title}\nModules: ${modules}`,
        max_tokens: 800,
        temperature: 0.7,
      });
      return data.data as AIResponse;
    },
  });
}
