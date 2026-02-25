"use client";

import { useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ForgotPasswordSchema, type ForgotPasswordInput } from "@repo/shared/schemas";

const inputClass = "w-full rounded-lg border border-border bg-bg-tertiary px-4 py-3 text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors";
const errorInputClass = "w-full rounded-lg border border-danger bg-bg-tertiary px-4 py-3 text-foreground placeholder:text-text-muted focus:border-danger focus:outline-none focus:ring-1 focus:ring-danger transition-colors";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(ForgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setLoading(true);
    try {
      await apiClient.post("/api/auth/forgot-password", data);
      setSent(true);
    } catch {
      setSent(true); // Always show success for security
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-accent/20 via-bg-secondary to-bg-primary p-12">
        <div>
          <span className="text-2xl font-bold text-accent">G</span>
          <span className="text-2xl font-bold text-accent">rit</span>
          <span className="ml-2 rounded-md bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
            Admin
          </span>
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-foreground leading-tight">
            Reset your<br />password.
          </h1>
          <p className="text-text-secondary text-lg max-w-md">
            Enter your email and we&apos;ll send you a link to get back into your account.
          </p>
        </div>
        <p className="text-text-muted text-sm">Built with Grit — Go + React framework</p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden text-center mb-8">
            <span className="text-2xl font-bold text-accent">Grit</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground">Forgot password?</h2>
            <p className="mt-2 text-text-secondary">No worries, we&apos;ll send you reset instructions.</p>
          </div>

          {sent ? (
            <div className="rounded-xl bg-bg-secondary border border-border p-8 text-center space-y-4">
              <div className="flex justify-center">
                <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                  <svg className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-medium text-foreground">Check your email</h3>
              <p className="text-text-secondary text-sm">
                If an account with that email exists, we&apos;ve sent a password reset link.
              </p>
              <Link
                href="/login"
                className="inline-block text-accent hover:text-accent-hover font-medium text-sm transition-colors"
              >
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-text-secondary">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  {...register("email")}
                  className={errors.email ? errorInputClass : inputClass}
                  placeholder="you@example.com"
                  autoFocus
                />
                {errors.email && <p className="text-sm text-danger">{errors.email.message}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-accent py-3 font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-text-secondary">
            <Link href="/login" className="text-accent hover:text-accent-hover font-medium transition-colors">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
