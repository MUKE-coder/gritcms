"use client";

import Link from "next/link";
import { getIcon } from "@/lib/icons";

const sections = [
  { label: "Pages", description: "Manage website pages", href: "/website/pages", icon: "FileText" },
  { label: "Blog Posts", description: "Write and publish articles", href: "/website/posts", icon: "Newspaper" },
  { label: "Categories", description: "Organize blog posts", href: "/website/categories", icon: "Tag" },
  { label: "Tags", description: "Label blog posts", href: "/website/tags", icon: "Tag" },
  { label: "Menus", description: "Navigation menus", href: "/website/menus", icon: "Layers" },
  { label: "SEO Settings", description: "Search engine optimization", href: "/website/seo", icon: "Globe" },
  { label: "Theme", description: "Colors, fonts & branding", href: "/website/theme", icon: "Palette" },
];

export default function WebsitePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Website</h1>
        <p className="text-text-secondary mt-1">Manage your website pages, blog, menus, and SEO settings.</p>
      </div>

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
