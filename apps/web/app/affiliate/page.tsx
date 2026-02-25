"use client";

import Link from "next/link";
import {
  DollarSign,
  Link as LinkIcon,
  BarChart3,
  History,
  ArrowRight,
} from "lucide-react";

const FEATURES = [
  {
    icon: DollarSign,
    title: "Earnings Overview",
    description: "Track your commissions and see real-time earnings in your personalized dashboard.",
  },
  {
    icon: LinkIcon,
    title: "Referral Link Generator",
    description: "Create and manage custom referral links for any page or product.",
  },
  {
    icon: BarChart3,
    title: "Click & Conversion Stats",
    description: "Monitor click-through rates, conversions, and performance of every referral link.",
  },
  {
    icon: History,
    title: "Commission History",
    description: "View a complete log of all commissions earned, approved, and paid out.",
  },
  {
    icon: DollarSign,
    title: "Payout History",
    description: "Keep track of all your payouts, pending amounts, and payment methods.",
  },
];

export default function AffiliatePortalPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Affiliate Dashboard
        </h1>
        <p className="mt-3 text-lg text-text-secondary max-w-2xl mx-auto">
          Earn commissions by sharing products you love. Sign in to access your
          affiliate dashboard.
        </p>
      </div>

      {/* Sign-in placeholder card */}
      <div className="rounded-xl border border-border bg-bg-elevated p-8 text-center mb-12">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
          <DollarSign className="h-8 w-8 text-accent" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Sign in to view your dashboard
        </h2>
        <p className="text-text-secondary max-w-md mx-auto mb-6">
          As an affiliate, you can track your referral links, view your earnings,
          and request payouts all from one place. Sign in to get started.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
          >
            Sign In
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/affiliate/apply"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg-elevated px-6 py-2.5 text-sm font-medium text-foreground hover:bg-bg-hover transition-colors"
          >
            Apply to become an affiliate
          </Link>
        </div>
      </div>

      {/* Features list */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-6 text-center">
          What you get as an affiliate
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border bg-bg-elevated p-5 hover:border-accent/30 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                  <feature.icon className="h-5 w-5 text-accent" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-medium text-foreground">
                    {feature.title}
                  </h4>
                  <p className="mt-1 text-sm text-text-secondary leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
