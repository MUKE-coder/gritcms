"use client";

import { useState, useEffect } from "react";
import { getIcon, ExternalLink, Loader2 } from "@/lib/icons";
import { useSettings, useUpdateSettings } from "@/hooks/use-website";

export default function SEOSettingsPage() {
  const GlobeIcon = getIcon("Globe");

  const { data: seoSettings, isLoading } = useSettings("seo");
  const { mutate: saveSettings, isPending } = useUpdateSettings();

  const [defaultMetaTitle, setDefaultMetaTitle] = useState("");
  const [defaultMetaDescription, setDefaultMetaDescription] = useState("");
  const [googleVerification, setGoogleVerification] = useState("");
  const [bingVerification, setBingVerification] = useState("");

  useEffect(() => {
    if (seoSettings) {
      setDefaultMetaTitle(seoSettings.default_meta_title || "");
      setDefaultMetaDescription(seoSettings.default_meta_description || "");
      setGoogleVerification(seoSettings.google_verification || "");
      setBingVerification(seoSettings.bing_verification || "");
    }
  }, [seoSettings]);

  const handleSave = () => {
    saveSettings({
      group: "seo",
      settings: {
        default_meta_title: defaultMetaTitle,
        default_meta_description: defaultMetaDescription,
        google_verification: googleVerification,
        bing_verification: bingVerification,
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">SEO Settings</h1>
        <p className="text-text-secondary mt-1">Configure search engine optimization settings for your website</p>
      </div>

      {/* Auto-generated endpoints */}
      <div className="rounded-xl border border-border bg-bg-secondary p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Auto-Generated</h2>
        <p className="text-sm text-text-secondary">These endpoints are automatically generated from your published content.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-border bg-bg-tertiary px-4 py-3 hover:border-accent/30 transition-colors group">
            <GlobeIcon className="h-5 w-5 text-accent" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">sitemap.xml</p>
              <p className="text-xs text-text-muted">All pages & posts</p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-text-muted" />
          </a>
          <a href="/robots.txt" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-border bg-bg-tertiary px-4 py-3 hover:border-accent/30 transition-colors group">
            <GlobeIcon className="h-5 w-5 text-accent" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">robots.txt</p>
              <p className="text-xs text-text-muted">Crawler rules</p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-text-muted" />
          </a>
          <a href="/api/rss.xml" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-border bg-bg-tertiary px-4 py-3 hover:border-accent/30 transition-colors group">
            <GlobeIcon className="h-5 w-5 text-accent" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">RSS Feed</p>
              <p className="text-xs text-text-muted">Blog feed</p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-text-muted" />
          </a>
        </div>
      </div>

      {/* Default Meta Tags */}
      <div className="rounded-xl border border-border bg-bg-secondary p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Default Meta Tags</h2>
        <p className="text-sm text-text-secondary">Used as fallbacks when pages don&apos;t have custom meta tags.</p>
        <div className="space-y-3 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Default Title</label>
            <input type="text" value={defaultMetaTitle} onChange={(e) => setDefaultMetaTitle(e.target.value)} placeholder="Your Site Name | Tagline" className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Default Description</label>
            <textarea value={defaultMetaDescription} onChange={(e) => setDefaultMetaDescription(e.target.value)} placeholder="A brief description of your site..." rows={3} className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none resize-none" />
          </div>
        </div>
      </div>

      {/* Verification */}
      <div className="rounded-xl border border-border bg-bg-secondary p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Search Engine Verification</h2>
        <div className="space-y-3 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Google Search Console</label>
            <input type="text" value={googleVerification} onChange={(e) => setGoogleVerification(e.target.value)} placeholder="Verification meta tag content" className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Bing Webmaster Tools</label>
            <input type="text" value={bingVerification} onChange={(e) => setBingVerification(e.target.value)} placeholder="Verification meta tag content" className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none" />
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-accent px-6 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
