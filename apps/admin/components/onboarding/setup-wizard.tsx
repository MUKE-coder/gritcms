"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronRight,
  ArrowRight,
  Globe,
  Mail,
  GraduationCap,
  FileText,
  Zap,
  ExternalLink,
} from "@/lib/icons";

/* ─── localStorage key ────────────────────────────────────────── */
const ONBOARDED_KEY = "gritcms-onboarded";

/* ─── useOnboarding hook ──────────────────────────────────────── */
export function useOnboarding() {
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDED_KEY);
    if (done !== "true") {
      setShowWizard(true);
    }
  }, []);

  const completeWizard = useCallback(() => {
    localStorage.setItem(ONBOARDED_KEY, "true");
    setShowWizard(false);
  }, []);

  return { showWizard, completeWizard };
}

/* ─── Step Data Types ─────────────────────────────────────────── */
interface SiteSettings {
  siteName: string;
  siteTagline: string;
  logoUrl: string;
}

interface EmailListSettings {
  listName: string;
  listDescription: string;
}

/* ─── Animated Step Wrapper ───────────────────────────────────── */
function StepTransition({
  active,
  direction,
  children,
}: {
  active: boolean;
  direction: "left" | "right";
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(active);
  const [animClass, setAnimClass] = useState("");

  useEffect(() => {
    if (active) {
      setVisible(true);
      // Start offscreen, then slide in
      setAnimClass(
        direction === "right"
          ? "translate-x-8 opacity-0"
          : "-translate-x-8 opacity-0"
      );
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimClass("translate-x-0 opacity-100");
        });
      });
    } else {
      // Slide out
      setAnimClass(
        direction === "right"
          ? "-translate-x-8 opacity-0"
          : "translate-x-8 opacity-0"
      );
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [active, direction]);

  if (!visible) return null;

  return (
    <div
      ref={ref}
      className={`transition-all duration-300 ease-out ${animClass}`}
    >
      {children}
    </div>
  );
}

/* ─── Setup Wizard Component ──────────────────────────────────── */
export function SetupWizard() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    siteName: "",
    siteTagline: "",
    logoUrl: "",
  });
  const [emailList, setEmailList] = useState<EmailListSettings>({
    listName: "",
    listDescription: "",
  });
  const [skippedEmail, setSkippedEmail] = useState(false);
  const { completeWizard } = useOnboarding();
  const router = useRouter();

  const totalSteps = 4;

  const goNext = () => {
    setDirection("right");
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  };

  const goPrev = () => {
    setDirection("left");
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSkipEmail = () => {
    setSkippedEmail(true);
    goNext();
  };

  const handleComplete = () => {
    completeWizard();
    router.push("/dashboard");
  };

  const progressPercent = ((step + 1) / totalSteps) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/4 h-[800px] w-[800px] rounded-full bg-accent/[0.03] blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/4 h-[600px] w-[600px] rounded-full bg-accent/[0.02] blur-3xl" />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-2xl mx-4">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="h-1 w-full rounded-full bg-border">
            <div
              className="h-1 rounded-full bg-accent transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Step indicator dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`
                h-2 rounded-full transition-all duration-300
                ${i === step
                  ? "w-8 bg-accent"
                  : i < step
                  ? "w-2 bg-accent/50"
                  : "w-2 bg-border"
                }
              `}
            />
          ))}
        </div>

        {/* Card body */}
        <div className="rounded-xl border border-border bg-bg-secondary p-8 shadow-2xl shadow-black/20">
          {/* Step 1: Welcome */}
          <StepTransition active={step === 0} direction={direction}>
            <WelcomeStep onNext={goNext} />
          </StepTransition>

          {/* Step 2: Site Settings */}
          <StepTransition active={step === 1} direction={direction}>
            <SiteSettingsStep
              settings={siteSettings}
              onChange={setSiteSettings}
              onNext={goNext}
              onPrev={goPrev}
            />
          </StepTransition>

          {/* Step 3: Email List */}
          <StepTransition active={step === 2} direction={direction}>
            <EmailListStep
              settings={emailList}
              onChange={setEmailList}
              onNext={goNext}
              onPrev={goPrev}
              onSkip={handleSkipEmail}
            />
          </StepTransition>

          {/* Step 4: Completion */}
          <StepTransition active={step === 3} direction={direction}>
            <CompletionStep
              siteSettings={siteSettings}
              emailList={emailList}
              skippedEmail={skippedEmail}
              onComplete={handleComplete}
            />
          </StepTransition>
        </div>

        {/* Step label */}
        <p className="text-center text-xs text-text-muted mt-4">
          Step {step + 1} of {totalSteps}
        </p>
      </div>
    </div>
  );
}

/* ─── Step 1: Welcome ─────────────────────────────────────────── */
function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center py-4">
      {/* Logo */}
      <div className="inline-flex items-center justify-center mb-8">
        <div className="relative">
          <div className="h-20 w-20 rounded-2xl bg-accent/10 flex items-center justify-center ring-1 ring-accent/20">
            <span className="text-4xl font-bold text-accent">G</span>
          </div>
          <div className="absolute -inset-2 rounded-3xl bg-accent/5 -z-10 blur-sm" />
        </div>
      </div>

      <h1 className="text-3xl font-bold text-foreground mb-3">
        Welcome to GritCMS
      </h1>
      <p className="text-text-secondary text-lg mb-2 max-w-md mx-auto">
        Let&apos;s set up your creator platform in a few minutes.
      </p>
      <p className="text-text-muted text-sm mb-10 max-w-sm mx-auto">
        You&apos;ll configure your site, create your first email list, and be
        ready to start building.
      </p>

      <button
        onClick={onNext}
        className="inline-flex items-center gap-2 rounded-xl bg-accent px-8 py-3 text-sm font-semibold text-white hover:bg-accent-hover transition-colors shadow-lg shadow-accent/20"
      >
        Get Started
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ─── Step 2: Site Settings ───────────────────────────────────── */
function SiteSettingsStep({
  settings,
  onChange,
  onNext,
  onPrev,
}: {
  settings: SiteSettings;
  onChange: (s: SiteSettings) => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const update = (key: keyof SiteSettings, value: string) => {
    onChange({ ...settings, [key]: value });
  };

  const canContinue = settings.siteName.trim().length > 0;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground mb-1">
          Site Settings
        </h2>
        <p className="text-sm text-text-secondary">
          Configure the basics for your platform.
        </p>
      </div>

      <div className="space-y-4 mb-6">
        {/* Site Name */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            Site Name <span className="text-danger ml-1">*</span>
          </label>
          <input
            type="text"
            value={settings.siteName}
            onChange={(e) => update("siteName", e.target.value)}
            placeholder="My Creator Hub"
            className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* Tagline */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            Site Tagline
          </label>
          <input
            type="text"
            value={settings.siteTagline}
            onChange={(e) => update("siteTagline", e.target.value)}
            placeholder="Empowering creators everywhere"
            className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* Logo URL */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            Logo URL{" "}
            <span className="text-text-muted font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={settings.logoUrl}
            onChange={(e) => update("logoUrl", e.target.value)}
            placeholder="https://example.com/logo.png"
            className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <p className="text-xs text-text-muted">
            You can always change this later in Settings.
          </p>
        </div>
      </div>

      {/* Preview */}
      <div className="mb-8 rounded-xl border border-border bg-bg-elevated p-5">
        <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
          Preview
        </p>
        <div className="flex items-center gap-3">
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt="Logo preview"
              className="h-10 w-10 rounded-lg object-cover border border-border"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <span className="text-lg font-bold text-accent">
                {settings.siteName.charAt(0).toUpperCase() || "G"}
              </span>
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-foreground">
              {settings.siteName || "Your Site Name"}
            </p>
            <p className="text-xs text-text-muted">
              {settings.siteTagline || "Your tagline here"}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onPrev}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!canContinue}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Continue
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ─── Step 3: Email List ──────────────────────────────────────── */
function EmailListStep({
  settings,
  onChange,
  onNext,
  onPrev,
  onSkip,
}: {
  settings: EmailListSettings;
  onChange: (s: EmailListSettings) => void;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}) {
  const update = (key: keyof EmailListSettings, value: string) => {
    onChange({ ...settings, [key]: value });
  };

  const canContinue = settings.listName.trim().length > 0;

  return (
    <div>
      <div className="mb-6">
        <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-accent/10 mb-3">
          <Mail className="h-5 w-5 text-accent" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-1">
          Create Your First Email List
        </h2>
        <p className="text-sm text-text-secondary">
          Start growing your audience from day one. Create a list to collect
          subscribers.
        </p>
      </div>

      <div className="space-y-4 mb-8">
        {/* List Name */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            List Name <span className="text-danger ml-1">*</span>
          </label>
          <input
            type="text"
            value={settings.listName}
            onChange={(e) => update("listName", e.target.value)}
            placeholder="Newsletter"
            className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            Description
          </label>
          <textarea
            value={settings.listDescription}
            onChange={(e) => update("listDescription", e.target.value)}
            placeholder="Weekly updates, tips, and exclusive content for subscribers"
            rows={3}
            className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none"
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onPrev}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover transition-colors"
        >
          Back
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={onSkip}
            className="rounded-lg px-4 py-2 text-sm font-medium text-text-muted hover:text-text-secondary transition-colors"
          >
            Skip for now
          </button>
          <button
            onClick={onNext}
            disabled={!canContinue}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Continue
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Step 4: Completion ──────────────────────────────────────── */
function CompletionStep({
  siteSettings,
  emailList,
  skippedEmail,
  onComplete,
}: {
  siteSettings: SiteSettings;
  emailList: EmailListSettings;
  skippedEmail: boolean;
  onComplete: () => void;
}) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const quickLinks = [
    {
      label: "Create a Page",
      href: "/website",
      icon: Globe,
      color: "text-info",
      bg: "bg-info/10",
    },
    {
      label: "Write a Blog Post",
      href: "/website?tab=blog",
      icon: FileText,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Send a Campaign",
      href: "/email",
      icon: Mail,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      label: "Create a Course",
      href: "/courses",
      icon: GraduationCap,
      color: "text-accent",
      bg: "bg-accent/10",
    },
  ];

  return (
    <div className="text-center py-2">
      {/* Checkmark animation */}
      <div className="inline-flex items-center justify-center mb-6">
        <div
          className={`
            relative h-16 w-16 rounded-full bg-success/10 flex items-center justify-center
            transition-all duration-500
            ${showConfetti ? "scale-100 opacity-100" : "scale-50 opacity-0"}
          `}
        >
          <Check className="h-8 w-8 text-success" />
          <div className="absolute -inset-2 rounded-full bg-success/5 -z-10 animate-pulse" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-foreground mb-2">
        You&apos;re All Set!
      </h2>
      <p className="text-sm text-text-secondary mb-6 max-w-sm mx-auto">
        Your creator platform is ready. Here&apos;s a summary of what you
        configured.
      </p>

      {/* Summary */}
      <div className="rounded-xl border border-border bg-bg-elevated p-4 mb-6 text-left">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              <Zap className="h-4 w-4 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {siteSettings.siteName || "Site"}
              </p>
              <p className="text-xs text-text-muted truncate">
                {siteSettings.siteTagline || "No tagline set"}
              </p>
            </div>
            <Check className="h-4 w-4 text-success ml-auto shrink-0" />
          </div>

          <div className="border-t border-border" />

          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              <Mail className="h-4 w-4 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {skippedEmail
                  ? "Email list"
                  : emailList.listName || "Email list"}
              </p>
              <p className="text-xs text-text-muted truncate">
                {skippedEmail
                  ? "Skipped -- you can create one later"
                  : emailList.listDescription || "No description"}
              </p>
            </div>
            {skippedEmail ? (
              <span className="text-xs text-text-muted ml-auto shrink-0">
                Skipped
              </span>
            ) : (
              <Check className="h-4 w-4 text-success ml-auto shrink-0" />
            )}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="mb-8">
        <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
          Quick Start
        </p>
        <div className="grid grid-cols-2 gap-2">
          {quickLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => {
                e.preventDefault();
                localStorage.setItem(ONBOARDED_KEY, "true");
                window.location.href = link.href;
              }}
              className="flex items-center gap-2.5 rounded-xl border border-border bg-bg-elevated px-3 py-2.5 text-left hover:bg-bg-hover transition-colors group"
            >
              <div
                className={`h-8 w-8 rounded-lg ${link.bg} flex items-center justify-center shrink-0`}
              >
                <link.icon className={`h-4 w-4 ${link.color}`} />
              </div>
              <span className="text-sm font-medium text-text-secondary group-hover:text-foreground transition-colors">
                {link.label}
              </span>
              <ExternalLink className="h-3 w-3 text-text-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          ))}
        </div>
      </div>

      {/* Go to dashboard */}
      <button
        onClick={onComplete}
        className="inline-flex items-center gap-2 rounded-xl bg-accent px-8 py-3 text-sm font-semibold text-white hover:bg-accent-hover transition-colors shadow-lg shadow-accent/20"
      >
        Go to Dashboard
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
