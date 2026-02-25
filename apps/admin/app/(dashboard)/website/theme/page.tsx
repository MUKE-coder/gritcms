"use client";

import { useState, useEffect } from "react";
import { Loader2, X } from "@/lib/icons";
import { useSettings, useUpdateSettings } from "@/hooks/use-website";

const defaultColors = [
  { key: "accent_color", label: "Accent Color", default: "#6366f1" },
  { key: "background_color", label: "Background", default: "#0a0a0b" },
  { key: "foreground_color", label: "Text Color", default: "#fafafa" },
];

const fontOptions = [
  "DM Sans",
  "Inter",
  "Poppins",
  "Nunito",
  "Open Sans",
  "Roboto",
  "Lato",
  "Montserrat",
  "Source Sans 3",
  "Raleway",
];

export default function ThemeSettingsPage() {
  const { data: themeSettings, isLoading } = useSettings("theme");
  const { mutate: saveSettings, isPending } = useUpdateSettings();

  const [siteName, setSiteName] = useState("");
  const [siteTagline, setSiteTagline] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [accentColor, setAccentColor] = useState("#6366f1");
  const [backgroundColor, setBackgroundColor] = useState("#0a0a0b");
  const [foregroundColor, setForegroundColor] = useState("#fafafa");
  const [headingFont, setHeadingFont] = useState("DM Sans");
  const [bodyFont, setBodyFont] = useState("DM Sans");
  const [socialTwitter, setSocialTwitter] = useState("");
  const [socialGithub, setSocialGithub] = useState("");
  const [socialLinkedin, setSocialLinkedin] = useState("");
  const [socialYoutube, setSocialYoutube] = useState("");
  const [footerText, setFooterText] = useState("");

  useEffect(() => {
    if (themeSettings) {
      setSiteName(themeSettings.site_name || "");
      setSiteTagline(themeSettings.site_tagline || "");
      setLogoUrl(themeSettings.logo_url || "");
      setFaviconUrl(themeSettings.favicon_url || "");
      setAccentColor(themeSettings.accent_color || "#6366f1");
      setBackgroundColor(themeSettings.background_color || "#0a0a0b");
      setForegroundColor(themeSettings.foreground_color || "#fafafa");
      setHeadingFont(themeSettings.heading_font || "DM Sans");
      setBodyFont(themeSettings.body_font || "DM Sans");
      setSocialTwitter(themeSettings.social_twitter || "");
      setSocialGithub(themeSettings.social_github || "");
      setSocialLinkedin(themeSettings.social_linkedin || "");
      setSocialYoutube(themeSettings.social_youtube || "");
      setFooterText(themeSettings.footer_text || "");
    }
  }, [themeSettings]);

  const handleSave = () => {
    saveSettings({
      group: "theme",
      settings: {
        site_name: siteName,
        site_tagline: siteTagline,
        logo_url: logoUrl,
        favicon_url: faviconUrl,
        accent_color: accentColor,
        background_color: backgroundColor,
        foreground_color: foregroundColor,
        heading_font: headingFont,
        body_font: bodyFont,
        social_twitter: socialTwitter,
        social_github: socialGithub,
        social_linkedin: socialLinkedin,
        social_youtube: socialYoutube,
        footer_text: footerText,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Theme Settings</h1>
          <p className="text-text-secondary mt-1">Customize the look and feel of your public website</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-accent px-6 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Saving..." : "Save Theme"}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Branding */}
        <div className="rounded-xl border border-border bg-bg-secondary p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Branding</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Site Name</label>
              <input type="text" value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="My Website" className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Tagline</label>
              <input type="text" value={siteTagline} onChange={(e) => setSiteTagline(e.target.value)} placeholder="A short description of your site" className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Logo URL</label>
              <input type="text" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.svg" className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none" />
              {logoUrl && (
                <div className="mt-2 relative inline-block">
                  <img src={logoUrl} alt="Logo preview" className="h-12 object-contain" />
                  <button onClick={() => setLogoUrl("")} className="absolute -top-1 -right-1 rounded bg-black/50 p-0.5 text-white hover:bg-black/70">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Favicon URL</label>
              <input type="text" value={faviconUrl} onChange={(e) => setFaviconUrl(e.target.value)} placeholder="https://example.com/favicon.ico" className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none" />
            </div>
          </div>
        </div>

        {/* Colors */}
        <div className="rounded-xl border border-border bg-bg-secondary p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Colors</h2>
          <div className="space-y-3">
            {defaultColors.map((color) => {
              const value = color.key === "accent_color" ? accentColor : color.key === "background_color" ? backgroundColor : foregroundColor;
              const setValue = color.key === "accent_color" ? setAccentColor : color.key === "background_color" ? setBackgroundColor : setForegroundColor;
              return (
                <div key={color.key}>
                  <label className="block text-sm font-medium text-foreground mb-1">{color.label}</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="h-9 w-9 cursor-pointer rounded border border-border bg-transparent"
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="flex-1 rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm font-mono text-foreground focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Color preview */}
          <div className="mt-4 rounded-lg overflow-hidden border border-border">
            <div className="px-4 py-3" style={{ backgroundColor, color: foregroundColor }}>
              <p className="text-sm font-medium">Preview</p>
              <p className="text-xs opacity-70 mt-1">This is how your site colors will look.</p>
              <button
                className="mt-2 rounded px-3 py-1 text-xs font-medium text-white"
                style={{ backgroundColor: accentColor }}
              >
                Accent Button
              </button>
            </div>
          </div>
        </div>

        {/* Typography */}
        <div className="rounded-xl border border-border bg-bg-secondary p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Typography</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Heading Font</label>
              <select value={headingFont} onChange={(e) => setHeadingFont(e.target.value)} className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-foreground focus:outline-none">
                {fontOptions.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Body Font</label>
              <select value={bodyFont} onChange={(e) => setBodyFont(e.target.value)} className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-foreground focus:outline-none">
                {fontOptions.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="rounded-xl border border-border bg-bg-secondary p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Social Links</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Twitter / X</label>
              <input type="text" value={socialTwitter} onChange={(e) => setSocialTwitter(e.target.value)} placeholder="https://twitter.com/yourhandle" className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">GitHub</label>
              <input type="text" value={socialGithub} onChange={(e) => setSocialGithub(e.target.value)} placeholder="https://github.com/yourusername" className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">LinkedIn</label>
              <input type="text" value={socialLinkedin} onChange={(e) => setSocialLinkedin(e.target.value)} placeholder="https://linkedin.com/in/yourprofile" className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">YouTube</label>
              <input type="text" value={socialYoutube} onChange={(e) => setSocialYoutube(e.target.value)} placeholder="https://youtube.com/@yourchannel" className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="rounded-xl border border-border bg-bg-secondary p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Footer</h2>
        <div className="max-w-lg">
          <label className="block text-sm font-medium text-foreground mb-1">Footer Text</label>
          <input type="text" value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="&copy; 2024 My Website. All rights reserved." className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none" />
        </div>
      </div>

      {/* Bottom Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-accent px-6 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Saving..." : "Save Theme"}
        </button>
      </div>
    </div>
  );
}
