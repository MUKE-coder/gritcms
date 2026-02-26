"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "@/lib/icons";
import { useRegister } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RegisterSchema, type RegisterInput } from "@repo/shared/schemas";

const inputClass =
  "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3.5 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:bg-white/[0.06] transition-all duration-200 text-[15px]";
const errorInputClass =
  "w-full rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/[0.04] px-4 py-3.5 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--danger)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--danger)]/20 transition-all duration-200 text-[15px]";

function getErrorMessage(error: unknown): string {
  const axiosErr = error as { response?: { data?: { error?: { code?: string; message?: string } }; status?: number }; message?: string };
  const apiError = axiosErr?.response?.data?.error;
  const status = axiosErr?.response?.status;

  if (apiError?.code === "EMAIL_EXISTS") return "An account with this email already exists. Try signing in instead.";
  if (apiError?.code === "VALIDATION_ERROR") return apiError?.message || "Please check your input and try again.";
  if (apiError?.message) return apiError.message;
  if (status === 0 || !axiosErr?.response) return "Unable to connect to the server. Please check your internet connection.";
  if (status === 500) return "Something went wrong on our end. Please try again later.";
  if (status === 503) return "Service is temporarily unavailable. Please try again in a moment.";
  return "An unexpected error occurred. Please try again.";
}

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const {
    mutate: registerUser,
    isPending,
    error: serverError,
  } = useRegister();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
  });

  const onSubmit = (data: RegisterInput) => {
    registerUser({
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      password: data.password,
    });
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel — immersive branding */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d0d1a] via-[#1a1035] to-[#0d0d1a]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(108,92,231,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(147,51,234,0.1),transparent_60%)]" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        {/* Floating orbs */}
        <div className="absolute top-1/3 right-1/3 w-72 h-72 bg-purple-500/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 left-1/3 w-56 h-56 bg-[var(--accent)]/8 rounded-full blur-[80px] animate-pulse [animation-delay:1.5s]" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[var(--accent)] flex items-center justify-center shadow-lg shadow-[var(--accent)]/25">
              <span className="text-lg font-bold text-white">G</span>
            </div>
            <span className="text-xl font-semibold text-white tracking-tight">
              GritCMS
            </span>
          </div>

          <div className="space-y-6 max-w-lg">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-sm">
              <span className="text-sm text-[var(--text-secondary)]">
                Everything you need to create
              </span>
            </div>
            <h1 className="text-5xl font-bold text-white leading-[1.1] tracking-tight">
              Start building{" "}
              <span className="bg-gradient-to-r from-[var(--accent)] to-purple-400 bg-clip-text text-transparent">
                something great
              </span>
            </h1>
            <p className="text-lg text-[var(--text-secondary)] leading-relaxed max-w-md">
              Website builder, email marketing, courses, commerce, and community
              — all in one self-hosted platform.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2">
            {[
              "Website Builder",
              "Email Marketing",
              "Online Courses",
              "Digital Products",
              "Community",
              "Analytics",
            ].map((feature) => (
              <span
                key={feature}
                className="rounded-full border border-white/[0.06] bg-white/[0.03] px-3.5 py-1.5 text-xs text-[var(--text-muted)]"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 bg-[var(--bg-primary)]">
        <div className="w-full max-w-[420px] space-y-7">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-[var(--accent)] flex items-center justify-center shadow-lg shadow-[var(--accent)]/25">
              <span className="text-lg font-bold text-white">G</span>
            </div>
            <span className="text-xl font-semibold text-white tracking-tight">
              GritCMS
            </span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Create your account
            </h2>
            <p className="text-[var(--text-secondary)] text-[15px]">
              Get started for free — no credit card required
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {serverError && (
              <div className="rounded-xl bg-[var(--danger)]/[0.08] border border-[var(--danger)]/20 px-4 py-3.5 text-sm text-[var(--danger)] flex items-start gap-2.5">
                <svg
                  className="h-4 w-4 shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                  />
                </svg>
                <span>{getErrorMessage(serverError)}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-[var(--text-secondary)]"
                >
                  First name
                </label>
                <input
                  id="firstName"
                  type="text"
                  {...register("firstName")}
                  className={errors.firstName ? errorInputClass : inputClass}
                  placeholder="John"
                  autoFocus
                />
                {errors.firstName && (
                  <p className="text-xs text-[var(--danger)]">
                    {errors.firstName.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-[var(--text-secondary)]"
                >
                  Last name
                </label>
                <input
                  id="lastName"
                  type="text"
                  {...register("lastName")}
                  className={errors.lastName ? errorInputClass : inputClass}
                  placeholder="Doe"
                />
                {errors.lastName && (
                  <p className="text-xs text-[var(--danger)]">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[var(--text-secondary)]"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                {...register("email")}
                className={errors.email ? errorInputClass : inputClass}
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="text-xs text-[var(--danger)]">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[var(--text-secondary)]"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  className={
                    (errors.password ? errorInputClass : inputClass) + " pr-12"
                  }
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-[18px] w-[18px]" />
                  ) : (
                    <Eye className="h-[18px] w-[18px]" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-[var(--danger)]">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-[var(--text-secondary)]"
              >
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  {...register("confirmPassword")}
                  className={
                    (errors.confirmPassword ? errorInputClass : inputClass) +
                    " pr-12"
                  }
                  placeholder="Repeat your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-[18px] w-[18px]" />
                  ) : (
                    <Eye className="h-[18px] w-[18px]" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-[var(--danger)]">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="relative w-full rounded-xl bg-[var(--accent)] py-3.5 font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-all duration-200 shadow-lg shadow-[var(--accent)]/20 hover:shadow-xl hover:shadow-[var(--accent)]/30 active:scale-[0.98] mt-2"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Creating account...
                </span>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-[var(--text-muted)]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
