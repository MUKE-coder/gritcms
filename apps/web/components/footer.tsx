"use client";

import Link from "next/link";
import { Github, Twitter, Linkedin, Youtube } from "lucide-react";
import { useMenu, useTheme } from "@/hooks/use-website";
import type { MenuItem } from "@repo/shared/types";

function menuItemToLink(item: MenuItem): { href: string; label: string; target?: string } {
  const href = item.page_id && item.page ? `/${item.page.slug}` : item.url || "#";
  return { href, label: item.label, target: item.target === "_blank" ? "_blank" : undefined };
}

export function Footer() {
  const { data: footerMenu } = useMenu("footer");
  const { data: theme } = useTheme();

  const footerLinks = footerMenu?.items?.map(menuItemToLink) ?? [
    { href: "https://github.com/MUKE-coder/grit", label: "GitHub", target: "_blank" },
    { href: "https://grit-vert.vercel.app/docs", label: "Documentation", target: "_blank" },
  ];

  const siteName = theme?.site_name || "gritcms";
  const hasSocials = theme?.social_twitter || theme?.social_github || theme?.social_linkedin || theme?.social_youtube;

  return (
    <footer className="border-t border-border/50 bg-background">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <span className="font-semibold text-text-secondary">{siteName}</span>
            <span className="text-border">·</span>
            <span>Built with Grit</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-text-muted">
            {footerLinks.map((link) =>
              link.target === "_blank" ? (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              )
            )}
          </div>
        </div>

        {/* Social links */}
        {hasSocials && (
          <div className="mt-4 flex items-center justify-center gap-4">
            {theme?.social_twitter && (
              <a href={theme.social_twitter} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-foreground transition-colors">
                <Twitter className="h-4 w-4" />
              </a>
            )}
            {theme?.social_github && (
              <a href={theme.social_github} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-foreground transition-colors">
                <Github className="h-4 w-4" />
              </a>
            )}
            {theme?.social_linkedin && (
              <a href={theme.social_linkedin} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-foreground transition-colors">
                <Linkedin className="h-4 w-4" />
              </a>
            )}
            {theme?.social_youtube && (
              <a href={theme.social_youtube} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-foreground transition-colors">
                <Youtube className="h-4 w-4" />
              </a>
            )}
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-border/30 text-center">
          <p className="text-xs text-text-muted">
            {theme?.footer_text || `\u00A9 ${new Date().getFullYear()} ${siteName}. All rights reserved.`}
          </p>
        </div>
      </div>
    </footer>
  );
}
