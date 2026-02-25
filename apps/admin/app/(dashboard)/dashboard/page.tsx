"use client";

import Link from "next/link";
import { useMe } from "@/hooks/use-auth";
import { StatsCard } from "@/components/widgets/stats-card";
import { getIcon } from "@/lib/icons";

const quickActions = [
  { label: "New Blog Post", href: "/website", icon: "FileText", color: "accent" },
  { label: "Email Campaign", href: "/email", icon: "Mail", color: "info" },
  { label: "New Course", href: "/courses", icon: "GraduationCap", color: "success" },
  { label: "View Contacts", href: "/contacts", icon: "Users", color: "warning" },
];

const moduleCards = [
  { label: "Website", description: "Pages, blog, SEO", href: "/website", icon: "Globe" },
  { label: "Email", description: "Campaigns & sequences", href: "/email", icon: "Mail" },
  { label: "Courses", description: "Create & manage courses", href: "/courses", icon: "GraduationCap" },
  { label: "Products", description: "Digital & physical", href: "/products", icon: "ShoppingBag" },
  { label: "Community", description: "Spaces & discussions", href: "/community", icon: "MessageCircle" },
  { label: "Funnels", description: "Sales & opt-in funnels", href: "/funnels", icon: "TrendingUp" },
  { label: "Booking", description: "Calendar & scheduling", href: "/booking", icon: "CalendarCheck" },
  { label: "Automation", description: "Workflows & triggers", href: "/automation", icon: "Zap" },
];

export default function AdminDashboard() {
  const { data: user } = useMe();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="rounded-xl border border-border bg-gradient-to-r from-accent/10 via-bg-secondary to-bg-secondary p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-foreground">
          {greeting()}, {user?.first_name || "Creator"}
        </h1>
        <p className="text-text-secondary mt-1">
          Welcome to your creator operating system. Here&apos;s your overview.
        </p>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Total Contacts" value="—" icon="Users" color="accent" />
        <StatsCard label="Email Subscribers" value="—" icon="Mail" color="info" />
        <StatsCard label="Active Students" value="—" icon="GraduationCap" color="success" />
        <StatsCard label="Revenue" value="—" icon="DollarSign" color="warning" />
      </div>

      {/* Quick Actions + Modules */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Modules Grid */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-bg-secondary p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Modules</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {moduleCards.map((m) => {
              const Icon = getIcon(m.icon);
              return (
                <Link
                  key={m.href}
                  href={m.href}
                  className="flex items-center gap-4 rounded-lg border border-border bg-bg-tertiary p-4 hover:border-accent/30 hover:bg-bg-hover transition-all group"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                    <Icon className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground group-hover:text-accent transition-colors">
                      {m.label}
                    </h3>
                    <p className="text-xs text-text-muted">{m.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-bg-secondary p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {quickActions.map((action) => {
                const Icon = getIcon(action.icon);
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="flex items-center gap-3 rounded-lg border border-border bg-bg-tertiary px-4 py-3 hover:border-accent/30 hover:bg-bg-hover transition-all group"
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-${action.color}/10`}>
                      <Icon className={`h-4 w-4 text-${action.color}`} />
                    </div>
                    <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">
                      {action.label}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* System Links */}
          <div className="rounded-xl border border-border bg-bg-secondary p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">System</h2>
            <div className="space-y-2">
              <a
                href="http://localhost:8080/studio"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border bg-bg-tertiary px-4 py-3 hover:border-accent/30 hover:bg-bg-hover transition-all group"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-info/10">
                  <span className="text-info text-sm font-bold">DB</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">GORM Studio</p>
                  <p className="text-xs text-text-muted">Browse database</p>
                </div>
              </a>
              <a
                href="http://localhost:8080/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border bg-bg-tertiary px-4 py-3 hover:border-accent/30 hover:bg-bg-hover transition-all group"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-success/10">
                  <span className="text-success text-sm font-bold">API</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">API Docs</p>
                  <p className="text-xs text-text-muted">REST API reference</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
