"use client";

import { useEffect } from "react";
import { useTheme, type ThemeSettings } from "@/hooks/use-website";

function hexToHSL(hex: string): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyTheme(theme: ThemeSettings) {
  const root = document.documentElement;

  if (theme.accent_color) {
    const hsl = hexToHSL(theme.accent_color);
    if (hsl) root.style.setProperty("--accent", hsl);
  }
  if (theme.background_color) {
    const hsl = hexToHSL(theme.background_color);
    if (hsl) root.style.setProperty("--background", hsl);
  }
  if (theme.foreground_color) {
    const hsl = hexToHSL(theme.foreground_color);
    if (hsl) root.style.setProperty("--foreground", hsl);
  }

  // Update page title with site name
  if (theme.site_name) {
    const existing = document.title;
    if (!existing.includes(theme.site_name)) {
      document.title = `${theme.site_name}${theme.site_tagline ? ` — ${theme.site_tagline}` : ""}`;
    }
  }

  // Favicon
  if (theme.favicon_url) {
    let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = theme.favicon_url;
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: theme } = useTheme();

  useEffect(() => {
    if (theme && Object.keys(theme).length > 0) {
      applyTheme(theme);
    }
  }, [theme]);

  return <>{children}</>;
}
