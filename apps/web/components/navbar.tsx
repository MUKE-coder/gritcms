"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Github } from "lucide-react";
import { useMenu, useTheme } from "@/hooks/use-website";
import type { MenuItem } from "@repo/shared/types";

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001";

const defaultLinks: { href: string; label: string; target?: string }[] = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
];

function menuItemToLink(item: MenuItem): { href: string; label: string; target?: string } {
  const href = item.page_id && item.page ? `/${item.page.slug}` : item.url || "#";
  return { href, label: item.label, target: item.target === "_blank" ? "_blank" : undefined };
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { data: headerMenu } = useMenu("header");
  const { data: theme } = useTheme();

  const navLinks = headerMenu?.items && headerMenu.items.length > 0
    ? headerMenu.items.map(menuItemToLink)
    : defaultLinks;

  const siteName = theme?.site_name || "gritcms";

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          {theme?.logo_url ? (
            <img src={theme.logo_url} alt={siteName} className="h-8 object-contain" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 border border-accent/20">
              <span className="text-accent font-mono font-bold text-sm">{siteName.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <span className="text-lg font-bold tracking-tight">{siteName}</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              target={link.target}
              className={`text-sm transition-colors ${
                pathname === link.href
                  ? "text-foreground font-medium"
                  : "text-text-secondary hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://github.com/MUKE-coder/grit"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-secondary hover:text-foreground transition-colors"
          >
            <Github className="h-5 w-5" />
          </a>
          <a
            href={`${ADMIN_URL}/login`}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
          >
            Admin
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-text-secondary hover:text-foreground transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-lg">
          <div className="mx-auto max-w-5xl px-6 py-4 flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                target={link.target}
                onClick={() => setMobileOpen(false)}
                className={`text-sm py-2 transition-colors ${
                  pathname === link.href
                    ? "text-foreground font-medium"
                    : "text-text-secondary hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <a
              href="https://github.com/MUKE-coder/grit"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm py-2 text-text-secondary hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <a
              href={`${ADMIN_URL}/login`}
              className="mt-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white text-center hover:bg-accent-hover transition-colors"
            >
              Admin
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
