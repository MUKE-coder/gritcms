"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useLogout } from "@/hooks/use-auth";
import { getResource } from "@/resources";
import { SearchTrigger } from "./command-search";
import { NotificationBell } from "./notifications";

interface User {
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

export function Navbar({ user, onMenuToggle }: { user: User; onMenuToggle: () => void }) {
  const { mutate: logout } = useLogout();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const pathname = usePathname();

  // Build breadcrumbs from pathname
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: { label: string; href: string }[] = [{ label: "Home", href: "/dashboard" }];

  for (let i = 0; i < segments.length; i++) {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const seg = segments[i];

    if (seg === "resources" && segments[i + 1]) {
      const resource = getResource(segments[i + 1]);
      if (resource) {
        breadcrumbs.push({
          label: resource.label?.plural ?? resource.name,
          href: href + "/" + segments[i + 1],
        });
        i++; // skip the next segment
        continue;
      }
    }

    breadcrumbs.push({
      label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " "),
      href,
    });
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background px-6">
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-bg-hover text-text-secondary"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Breadcrumbs */}
        <nav className="hidden sm:flex items-center gap-1.5 text-sm">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-text-muted">/</span>}
              {i === breadcrumbs.length - 1 ? (
                <span className="text-foreground font-medium">{crumb.label}</span>
              ) : (
                <a
                  href={crumb.href}
                  className="text-text-secondary hover:text-foreground transition-colors"
                >
                  {crumb.label}
                </a>
              )}
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {/* Global search trigger (Cmd+K) */}
        <SearchTrigger />

        {/* Notifications */}
        <NotificationBell />

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-bg-hover transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center">
              <span className="text-sm font-medium text-accent">
                {user.first_name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <span className="text-sm font-medium text-foreground hidden sm:block">
              {user.first_name}
            </span>
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-border bg-bg-elevated shadow-lg z-50">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-medium text-foreground">{user.first_name} {user.last_name}</p>
                  <p className="text-xs text-text-muted">{user.email}</p>
                </div>
                <button
                  onClick={() => logout()}
                  className="w-full px-4 py-2.5 text-left text-sm text-danger hover:bg-bg-hover transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
