"use client";

import { useState } from "react";
import Link from "next/link";
import { DollarSign, Clock, TrendingUp, CheckCircle } from "lucide-react";

const BENEFITS = [
  {
    icon: DollarSign,
    title: "Competitive Commission Rates",
    description:
      "Earn generous commissions on every successful referral. Our rates are among the best in the industry.",
  },
  {
    icon: Clock,
    title: "Cookie Tracking",
    description:
      "Extended cookie duration means you get credit for referrals even if they purchase days after clicking your link.",
  },
  {
    icon: TrendingUp,
    title: "Monthly Payouts",
    description:
      "Receive reliable monthly payouts once you reach the minimum threshold. Multiple payment methods available.",
  },
];

export default function AffiliateApplyPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    website: "",
    reason: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Become an Affiliate
        </h1>
        <p className="mt-3 text-lg text-text-secondary max-w-2xl mx-auto">
          Join our affiliate program and start earning commissions by promoting
          products you believe in.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-5">
        {/* Application form */}
        <div className="lg:col-span-3">
          {submitted ? (
            <div className="rounded-xl border border-border bg-bg-elevated p-8 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10">
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Application Submitted
              </h2>
              <p className="text-text-secondary max-w-md mx-auto mb-6">
                Thank you for your interest in our affiliate program! We will
                review your application and get back to you via email within a few
                business days.
              </p>
              <Link
                href="/affiliate"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg-elevated px-5 py-2.5 text-sm font-medium text-foreground hover:bg-bg-hover transition-colors"
              >
                Back to Affiliate Portal
              </Link>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-xl border border-border bg-bg-elevated p-6 space-y-5"
            >
              <h2 className="text-lg font-semibold text-foreground">
                Application Form
              </h2>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="john@example.com"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Website URL{" "}
                  <span className="text-text-muted font-normal">(optional)</span>
                </label>
                <input
                  type="url"
                  placeholder="https://yourwebsite.com"
                  value={form.website}
                  onChange={(e) =>
                    setForm({ ...form, website: e.target.value })
                  }
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Why do you want to be an affiliate?{" "}
                  <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Tell us about your audience, how you plan to promote, and why you're interested..."
                  value={form.reason}
                  onChange={(e) =>
                    setForm({ ...form, reason: e.target.value })
                  }
                  className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none transition-colors resize-y"
                />
              </div>

              <button
                type="submit"
                disabled={!form.name.trim() || !form.email.trim() || !form.reason.trim()}
                className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Submit Application
              </button>
            </form>
          )}
        </div>

        {/* Benefits sidebar */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            Why join our program?
          </h3>
          {BENEFITS.map((benefit) => (
            <div
              key={benefit.title}
              className="rounded-xl border border-border bg-bg-elevated p-5"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                  <benefit.icon className="h-4.5 w-4.5 text-accent" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-medium text-foreground text-sm">
                    {benefit.title}
                  </h4>
                  <p className="mt-1 text-xs text-text-secondary leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </div>
            </div>
          ))}

          <div className="rounded-xl border border-dashed border-border bg-bg-elevated/50 p-5 text-center">
            <p className="text-sm text-text-muted">
              Already an affiliate?
            </p>
            <Link
              href="/affiliate"
              className="mt-2 inline-flex text-sm font-medium text-accent hover:text-accent/80 transition-colors"
            >
              Go to your dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
