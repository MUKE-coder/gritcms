"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Search, X } from "@/lib/icons";
import { getIcon } from "@/lib/icons";

interface SearchItem {
  label: string;
  href: string;
  icon: string;
  category: string;
}

const searchItems: SearchItem[] = [
  // CMS Modules
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard", category: "Modules" },
  { label: "Contacts", href: "/contacts", icon: "Users", category: "Modules" },
  { label: "Website", href: "/website", icon: "Globe", category: "Modules" },
  { label: "Email", href: "/email", icon: "Mail", category: "Modules" },
  { label: "Courses", href: "/courses", icon: "GraduationCap", category: "Modules" },
  { label: "Community", href: "/community", icon: "MessageCircle", category: "Modules" },
  { label: "Products", href: "/products", icon: "ShoppingBag", category: "Modules" },
  { label: "Orders", href: "/orders", icon: "Receipt", category: "Modules" },
  { label: "Coupons", href: "/coupons", icon: "Tag", category: "Modules" },
  { label: "Funnels", href: "/funnels", icon: "TrendingUp", category: "Modules" },
  { label: "Booking", href: "/booking", icon: "CalendarCheck", category: "Modules" },
  { label: "Affiliates", href: "/affiliates", icon: "Link", category: "Modules" },
  { label: "Automation", href: "/automation", icon: "Zap", category: "Modules" },
  { label: "Analytics", href: "/analytics", icon: "BarChart3", category: "Modules" },
  // System
  { label: "Media Library", href: "/media", icon: "Image", category: "System" },
  { label: "Settings", href: "/settings", icon: "Settings", category: "System" },
  { label: "Profile", href: "/profile", icon: "UserCircle", category: "System" },
  { label: "Jobs", href: "/system/jobs", icon: "Briefcase", category: "System" },
  { label: "Files", href: "/system/files", icon: "FolderOpen", category: "System" },
  { label: "Cron", href: "/system/cron", icon: "Calendar", category: "System" },
  { label: "Security", href: "/system/security", icon: "Shield", category: "System" },
];

export function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const filtered = query.trim()
    ? searchItems.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase())
      )
    : searchItems;

  // Group by category
  const grouped = filtered.reduce<Record<string, SearchItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const flatFiltered = Object.values(grouped).flat();

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatFiltered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && flatFiltered[selectedIndex]) {
        e.preventDefault();
        navigate(flatFiltered[selectedIndex].href);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    },
    [flatFiltered, selectedIndex]
  );

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // Reset selection on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const navigate = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-bg-elevated shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-5 w-5 text-text-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search modules, pages..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-text-muted focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-bg-tertiary px-1.5 py-0.5 text-[10px] text-text-muted font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-72 overflow-y-auto p-2">
          {flatFiltered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-text-muted">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <p className="px-3 py-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  {category}
                </p>
                {items.map((item) => {
                  const globalIndex = flatFiltered.indexOf(item);
                  const Icon = getIcon(item.icon);
                  return (
                    <button
                      key={item.href}
                      data-index={globalIndex}
                      onClick={() => navigate(item.href)}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        globalIndex === selectedIndex
                          ? "bg-accent/10 text-accent"
                          : "text-text-secondary hover:bg-bg-hover hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-[11px] text-text-muted">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-bg-tertiary px-1 py-0.5 font-mono">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-bg-tertiary px-1 py-0.5 font-mono">↵</kbd>
            open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-bg-tertiary px-1 py-0.5 font-mono">esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Trigger button to show in the navbar */
export function SearchTrigger() {
  const [open, setOpen] = useState(false);

  // This component re-fires the Cmd+K event to open the CommandSearch
  const handleClick = () => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
    );
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 rounded-lg border border-border bg-bg-tertiary px-3 py-1.5 text-sm text-text-muted hover:text-text-secondary hover:border-border/80 transition-colors"
    >
      <Search className="h-4 w-4" />
      <span className="hidden md:inline">Search...</span>
      <kbd className="hidden md:inline-flex items-center gap-0.5 rounded border border-border bg-bg-secondary px-1.5 py-0.5 text-[10px] font-mono">
        ⌘K
      </kbd>
    </button>
  );
}
