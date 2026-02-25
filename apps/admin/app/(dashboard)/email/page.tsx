"use client";

import Link from "next/link";
import { getIcon } from "@/lib/icons";
import { useEmailDashboard } from "@/hooks/use-email";

const sections = [
  { label: "Lists", description: "Manage subscriber lists", href: "/email/lists", icon: "Layers" },
  { label: "Templates", description: "Design email templates", href: "/email/templates", icon: "FileText" },
  { label: "Campaigns", description: "Send email blasts", href: "/email/campaigns", icon: "Mail" },
  { label: "Sequences", description: "Automated drip sequences", href: "/email/sequences", icon: "Zap" },
  { label: "Segments", description: "Audience segments", href: "/email/segments", icon: "Users" },
];

export default function EmailPage() {
  const { data: stats } = useEmailDashboard();

  const statCards = [
    { label: "Total Subscribers", value: stats?.total_subscribers ?? 0, icon: "Users" },
    { label: "Email Lists", value: stats?.total_lists ?? 0, icon: "Layers" },
    { label: "Campaigns", value: stats?.total_campaigns ?? 0, icon: "Mail" },
    { label: "Emails Sent", value: stats?.total_sent ?? 0, icon: "Bell" },
    { label: "New (30d)", value: stats?.new_subscribers_30d ?? 0, icon: "TrendingUp" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Email Marketing</h1>
        <p className="text-text-secondary mt-1">Manage lists, templates, campaigns, sequences, and segments.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((s) => {
          const Icon = getIcon(s.icon);
          return (
            <div key={s.label} className="rounded-xl border border-border bg-bg-secondary p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
                  <Icon className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{s.value.toLocaleString()}</p>
                  <p className="text-xs text-text-muted">{s.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sections */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => {
          const Icon = getIcon(section.icon);
          return (
            <Link
              key={section.href}
              href={section.href}
              className="flex items-center gap-4 rounded-xl border border-border bg-bg-secondary p-5 hover:border-accent/30 hover:bg-bg-hover transition-all group"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                <Icon className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors">{section.label}</h3>
                <p className="text-sm text-text-muted">{section.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
