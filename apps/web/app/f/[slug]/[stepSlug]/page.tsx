"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  ChevronRight,
  Mail,
  ShieldCheck,
  Star,
  Gift,
  X,
} from "lucide-react";
import { usePublicStep } from "@/hooks/use-funnels";
import type { FunnelStep } from "@repo/shared/types";

function getNextStep(
  steps: FunnelStep[] | undefined,
  currentSlug: string
): FunnelStep | null {
  if (!steps || steps.length === 0) return null;
  const sorted = [...steps].sort((a, b) => a.sort_order - b.sort_order);
  const idx = sorted.findIndex((s) => s.slug === currentSlug);
  if (idx === -1 || idx === sorted.length - 1) return null;
  return sorted[idx + 1];
}

// -- Step renderers --

function LandingStep({ step }: { step: FunnelStep }) {
  const [email, setEmail] = useState("");

  return (
    <div className="text-center">
      {/* Hero */}
      <div className="mx-auto max-w-2xl">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground leading-tight">
          {step.name}
        </h1>
        {step.content && typeof step.content === "object" && "headline" in (step.content as Record<string, unknown>) ? (
          <p className="mt-4 text-xl text-text-secondary leading-relaxed">
            {String((step.content as Record<string, unknown>).headline)}
          </p>
        ) : (
          <p className="mt-4 text-xl text-text-secondary leading-relaxed">
            Get exclusive access. Enter your email below to get started.
          </p>
        )}
      </div>

      {/* Opt-in form */}
      <div className="mx-auto mt-10 max-w-md">
        <div className="rounded-xl border border-border bg-bg-elevated p-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Mail className="h-5 w-5 text-accent" />
            <span className="text-sm font-medium text-foreground">
              Sign up for free
            </span>
          </div>
          <div className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
            />
            <button
              type="button"
              className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
            >
              Get Started
            </button>
          </div>
          <p className="mt-3 text-xs text-text-muted flex items-center justify-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            We respect your privacy. Unsubscribe anytime.
          </p>
        </div>
      </div>
    </div>
  );
}

function SalesStep({ step }: { step: FunnelStep }) {
  return (
    <div>
      {/* Hero section */}
      <div className="text-center mx-auto max-w-3xl">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground leading-tight">
          {step.name}
        </h1>
        {step.content && typeof step.content === "object" && "description" in (step.content as Record<string, unknown>) ? (
          <p className="mt-4 text-lg text-text-secondary leading-relaxed max-w-2xl mx-auto">
            {String((step.content as Record<string, unknown>).description)}
          </p>
        ) : (
          <p className="mt-4 text-lg text-text-secondary leading-relaxed max-w-2xl mx-auto">
            Discover what makes this offer special and how it can help you
            achieve your goals faster.
          </p>
        )}
      </div>

      {/* Features / Benefits */}
      <div className="mx-auto mt-12 max-w-2xl grid gap-4 sm:grid-cols-2">
        {["Instant access", "Lifetime updates", "Expert support", "Money-back guarantee"].map(
          (feature) => (
            <div
              key={feature}
              className="flex items-start gap-3 rounded-xl border border-border bg-bg-elevated p-4"
            >
              <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <span className="text-sm text-foreground">{feature}</span>
            </div>
          )
        )}
      </div>

      {/* Testimonials placeholder */}
      <div className="mx-auto mt-12 max-w-2xl">
        <h2 className="text-lg font-semibold text-foreground mb-4 text-center">
          What others are saying
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-bg-elevated p-5"
            >
              <div className="flex gap-0.5 mb-3">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className="h-4 w-4 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <p className="text-sm text-text-secondary italic leading-relaxed">
                &ldquo;This completely changed how I approach my work. Highly
                recommend to anyone looking to level up.&rdquo;
              </p>
              <p className="mt-3 text-xs font-medium text-text-muted">
                -- Happy Customer
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mx-auto mt-12 max-w-md text-center">
        <button
          type="button"
          className="w-full rounded-lg bg-accent px-6 py-4 text-base font-semibold text-white hover:bg-accent-hover transition-colors"
        >
          Get Access Now
        </button>
        <p className="mt-2 text-xs text-text-muted">
          30-day money-back guarantee
        </p>
      </div>
    </div>
  );
}

function CheckoutStep({ step }: { step: FunnelStep }) {
  return (
    <div className="mx-auto max-w-lg text-center">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        {step.name}
      </h1>
      <p className="mt-3 text-text-secondary">
        You&apos;re almost there. Complete your purchase below.
      </p>

      <div className="mt-8 rounded-xl border border-border bg-bg-elevated p-6 text-left">
        <h2 className="text-sm font-semibold text-foreground mb-4">
          Order Summary
        </h2>
        <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
          <span className="text-sm text-text-secondary">Product</span>
          <span className="text-sm font-medium text-foreground">--</span>
        </div>
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-semibold text-foreground">Total</span>
          <span className="text-sm font-semibold text-foreground">--</span>
        </div>

        <button
          type="button"
          className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent-hover transition-colors flex items-center justify-center gap-2"
        >
          <ShieldCheck className="h-4 w-4" />
          Proceed to Checkout
        </button>
        <p className="mt-3 text-xs text-text-muted text-center">
          Secure checkout. Your payment details are protected.
        </p>
      </div>
    </div>
  );
}

function UpsellStep({
  step,
  variant,
}: {
  step: FunnelStep;
  variant: "upsell" | "downsell";
}) {
  return (
    <div className="mx-auto max-w-lg text-center">
      {/* Badge */}
      <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent mb-6">
        <Gift className="h-3.5 w-3.5" />
        {variant === "upsell" ? "Special Offer" : "Wait - One More Thing"}
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
        {step.name}
      </h1>
      <p className="mt-4 text-text-secondary leading-relaxed max-w-md mx-auto">
        {variant === "upsell"
          ? "Upgrade your order with this exclusive add-on, available only right now."
          : "Before you go, here\u2019s a special deal just for you."}
      </p>

      {/* Offer card */}
      <div className="mt-8 rounded-xl border-2 border-accent/30 bg-bg-elevated p-6">
        <div className="text-sm font-medium text-accent mb-2">
          Limited Time Offer
        </div>
        <div className="text-2xl font-bold text-foreground mb-4">
          {step.name}
        </div>

        <button
          type="button"
          className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent-hover transition-colors mb-3"
        >
          Yes, Add This to My Order
        </button>
        <button
          type="button"
          className="w-full rounded-lg border border-border px-4 py-3 text-sm font-medium text-text-secondary hover:text-foreground hover:border-border transition-colors flex items-center justify-center gap-1.5"
        >
          <X className="h-3.5 w-3.5" />
          No Thanks, Skip This
        </button>
      </div>
    </div>
  );
}

function ThankYouStep({ step }: { step: FunnelStep }) {
  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
        <CheckCircle className="h-8 w-8 text-green-500" />
      </div>
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
        {step.name}
      </h1>
      <p className="mt-4 text-lg text-text-secondary leading-relaxed">
        Thank you! Your order has been confirmed. Check your email for next
        steps and access details.
      </p>

      <div className="mt-8 rounded-xl border border-border bg-bg-elevated p-6">
        <h2 className="text-sm font-semibold text-foreground mb-2">
          What happens next?
        </h2>
        <ul className="text-sm text-text-secondary space-y-2 text-left">
          <li className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
            You&apos;ll receive a confirmation email shortly
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
            Access details will be sent to your inbox
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
            Our support team is here if you need help
          </li>
        </ul>
      </div>

      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
      >
        Return Home
      </Link>
    </div>
  );
}

// -- Main page --

export default function FunnelStepPage() {
  const params = useParams();
  const funnelSlug = typeof params.slug === "string" ? params.slug : "";
  const stepSlug =
    typeof params.stepSlug === "string" ? params.stepSlug : "";
  const {
    data,
    isLoading,
    error,
  } = usePublicStep(funnelSlug, stepSlug);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-elevated border border-border">
          <span className="text-2xl text-text-muted">404</span>
        </div>
        <h1 className="text-xl font-semibold text-foreground">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          This step doesn&apos;t exist or is no longer available.
        </p>
        <Link
          href={`/f/${funnelSlug}`}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Funnel
        </Link>
      </div>
    );
  }

  const { step, funnel } = data;
  const nextStep = getNextStep(funnel.steps, stepSlug);

  return (
    <div className="min-h-screen">
      {/* Breadcrumb */}
      <div className="border-b border-border/50">
        <div className="mx-auto max-w-4xl px-6 py-3 flex items-center gap-1.5 text-sm text-text-muted">
          <Link
            href={`/f/${funnelSlug}`}
            className="hover:text-foreground transition-colors"
          >
            {funnel.name}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium truncate">
            {step.name}
          </span>
        </div>
      </div>

      {/* Step content */}
      <div className="mx-auto max-w-4xl px-6 py-16">
        {step.type === "landing" && <LandingStep step={step} />}
        {step.type === "sales" && <SalesStep step={step} />}
        {step.type === "checkout" && <CheckoutStep step={step} />}
        {step.type === "upsell" && (
          <UpsellStep step={step} variant="upsell" />
        )}
        {step.type === "downsell" && (
          <UpsellStep step={step} variant="downsell" />
        )}
        {step.type === "thankyou" && <ThankYouStep step={step} />}

        {/* Next step navigation */}
        {nextStep && (
          <div className="mt-16 pt-8 border-t border-border/50 text-center">
            <Link
              href={`/f/${funnelSlug}/${nextStep.slug}`}
              className="inline-flex items-center gap-2 rounded-lg bg-accent/10 px-5 py-2.5 text-sm font-medium text-accent hover:bg-accent/20 transition-colors"
            >
              Next Step
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
