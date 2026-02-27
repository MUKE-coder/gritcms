"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Github, Sun, Moon, LogIn, BookOpen, LogOut, User as UserIcon } from "lucide-react";
import { useMenu, useTheme } from "@/hooks/use-website";
import { useColorMode } from "@/components/dark-mode-provider";
import { useAuth } from "@/hooks/use-auth";
import type { MenuItem } from "@repo/shared/types";

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001";

const defaultLinks: { href: string; label: string; target?: string }[] = [
  { href: "/", label: "Home" },
  { href: "/courses", label: "Courses" },
  { href: "/products", label: "Products" },
  { href: "/community", label: "Community" },
  { href: "/book", label: "Booking" },
  { href: "/blog", label: "Blog" },
];

function menuItemToLink(item: MenuItem): { href: string; label: string; target?: string } {
  const href = item.page_id && item.page ? `/${item.page.slug}` : item.url || "#";
  return { href, label: item.label, target: item.target === "_blank" ? "_blank" : undefined };
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { data: headerMenu } = useMenu("header");
  const { data: theme } = useTheme();
  const { theme: colorMode, toggleTheme } = useColorMode();
  const { user, isAuthenticated, logout } = useAuth();

  const navLinks = headerMenu?.items && headerMenu.items.length > 0
    ? headerMenu.items.map(menuItemToLink)
    : defaultLinks;

  const siteName = theme?.site_name || "gritcms";

  const isAdmin = user?.role === "ADMIN" || user?.role === "OWNER";

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const userInitials = user
    ? `${user.first_name?.charAt(0) || ""}${user.last_name?.charAt(0) || ""}`.toUpperCase() || user.email.charAt(0).toUpperCase()
    : "";

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
          <button
            onClick={toggleTheme}
            className="p-2 text-text-secondary hover:text-foreground transition-colors rounded-lg hover:bg-bg-hover"
            aria-label="Toggle dark mode"
          >
            {colorMode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <a
            href="https://github.com/MUKE-coder/grit"
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-secondary hover:text-foreground transition-colors"
          >
            <Github className="h-5 w-5" />
          </a>

          {isAuthenticated && user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.first_name}
                    className="h-8 w-8 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-accent/15 border border-accent/20 flex items-center justify-center text-accent text-xs font-semibold">
                    {userInitials}
                  </div>
                )}
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-border bg-bg-elevated shadow-xl py-1 z-50">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-sm font-medium text-foreground truncate">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-xs text-text-muted truncate">{user.email}</p>
                  </div>
                  <Link
                    href="/courses"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-foreground transition-colors"
                  >
                    <BookOpen className="h-4 w-4" />
                    My Courses
                  </Link>
                  {isAdmin && (
                    <a
                      href={`${ADMIN_URL}/login`}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-foreground transition-colors"
                    >
                      <UserIcon className="h-4 w-4" />
                      Admin Panel
                    </a>
                  )}
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-bg-hover transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
            >
              Sign in
            </Link>
          )}
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
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 text-sm py-2 text-text-secondary hover:text-foreground transition-colors"
            >
              {colorMode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {colorMode === "dark" ? "Light mode" : "Dark mode"}
            </button>
            <a
              href="https://github.com/MUKE-coder/grit"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm py-2 text-text-secondary hover:text-foreground transition-colors"
            >
              GitHub
            </a>

            {isAuthenticated && user ? (
              <>
                <div className="border-t border-border/50 pt-3 mt-1">
                  <p className="text-sm font-medium text-foreground">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="text-xs text-text-muted">{user.email}</p>
                </div>
                <Link
                  href="/courses"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 text-sm py-2 text-text-secondary hover:text-foreground transition-colors"
                >
                  <BookOpen className="h-4 w-4" />
                  My Courses
                </Link>
                {isAdmin && (
                  <a
                    href={`${ADMIN_URL}/login`}
                    className="flex items-center gap-2 text-sm py-2 text-text-secondary hover:text-foreground transition-colors"
                  >
                    <UserIcon className="h-4 w-4" />
                    Admin Panel
                  </a>
                )}
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                  }}
                  className="flex items-center gap-2 text-sm py-2 text-red-400 hover:text-red-300 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/auth/login"
                onClick={() => setMobileOpen(false)}
                className="mt-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white text-center hover:bg-accent-hover transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
