"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { resources } from "@/resources";
import { getIcon, ChevronLeft, ChevronRight, ChevronDown, Sun, Moon, LayoutDashboard, UserCircle, LogOut } from "@/lib/icons";
import { useTheme } from "@/components/shared/theme-provider";
import { useLogout } from "@/hooks/use-auth";

interface User {
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface SidebarProps {
  user: User;
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function UserMenu({ user, collapsed, fullName }: { user: User; collapsed: boolean; fullName: string }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ bottom: 0, left: 0, width: 0 });
  const router = useRouter();
  const { mutate: logout } = useLogout();

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ bottom: window.innerHeight - rect.top + 4, left: rect.left, width: rect.width });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, updatePosition]);

  const handleSignOut = () => {
    setOpen(false);
    logout(undefined, {
      onSuccess: () => router.push("/login"),
    });
  };

  const avatar = user.avatar ? (
    <img src={user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
  ) : (
    <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
      <span className="text-sm font-medium text-accent">{user.first_name?.charAt(0)?.toUpperCase()}</span>
    </div>
  );

  const menu = open ? createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] w-56 rounded-lg border border-border bg-bg-elevated shadow-xl"
      style={{ bottom: pos.bottom, left: pos.left, backgroundColor: "var(--bg-elevated, #22222e)" }}
    >
      <div className="p-3 border-b border-border">
        <p className="text-sm font-medium text-foreground truncate">{fullName}</p>
        <p className="text-xs text-text-muted truncate">{user.email}</p>
      </div>
      <div className="p-1">
        <button
          onClick={() => { setOpen(false); router.push("/profile"); }}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-foreground transition-colors"
        >
          <UserCircle className="h-4 w-4" />
          Profile
        </button>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div>
      <div
        ref={triggerRef}
        onClick={() => { if (!open) updatePosition(); setOpen(!open); }}
        className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-bg-hover transition-colors ${collapsed ? "justify-center" : ""}`}
      >
        {avatar}
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{fullName}</p>
              <p className="text-xs text-text-muted truncate">{user.role}</p>
            </div>
            <ChevronDown className={`h-3 w-3 text-text-muted transition-transform ${open ? "rotate-180" : ""}`} />
          </>
        )}
      </div>
      {menu}
    </div>
  );
}

export function Sidebar({ user, collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const isAdmin = user.role === "OWNER" || user.role === "ADMIN" || user.role === "EDITOR";

  // GritCMS module navigation
  const cmsModules = isAdmin
    ? [
        { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
        { label: "Contacts", href: "/contacts", icon: "Users" },
        { label: "Website", href: "/website", icon: "Globe" },
        { label: "Email", href: "/email", icon: "Mail" },
        { label: "Courses", href: "/courses", icon: "GraduationCap" },
        { label: "Community", href: "/community", icon: "MessageCircle" },
        { label: "Products", href: "/products", icon: "ShoppingBag" },
        { label: "Orders", href: "/orders", icon: "Receipt" },
        { label: "Coupons", href: "/coupons", icon: "Tag" },
        { label: "Funnels", href: "/funnels", icon: "TrendingUp" },
        { label: "Booking", href: "/booking", icon: "CalendarCheck" },
        { label: "Affiliates", href: "/affiliates", icon: "Link" },
        { label: "Automation", href: "/automation", icon: "Zap" },
        { label: "Analytics", href: "/analytics", icon: "BarChart3" },
      ]
    : [];

  // Resource pages (from grit generate resource)
  const resourceItems = isAdmin
    ? resources.map((r) => ({
        label: r.label?.plural ?? r.name,
        href: `/resources/${r.slug}`,
        icon: r.icon,
      }))
    : [];

  // Profile link is always visible
  const profileItem = { label: "Profile", href: "/profile", icon: "UserCircle" };

  const systemItems = isAdmin
    ? [
        { label: "Media", href: "/media", icon: "Image" },
        { label: "Settings", href: "/settings", icon: "Settings" },
        { label: "Jobs", href: "/system/jobs", icon: "Briefcase" },
        { label: "Files", href: "/system/files", icon: "FolderOpen" },
        { label: "Cron", href: "/system/cron", icon: "Calendar" },
        { label: "Security", href: "/system/security", icon: "Shield" },
      ]
    : [];

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ") || "User";

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className={`flex h-16 items-center border-b border-border px-4 ${collapsed ? "justify-center" : "gap-2 px-6"}`}>
        <span className="text-xl font-bold text-accent">G</span>
        {!collapsed && (
          <>
            <span className="text-xl font-bold text-accent">ritCMS</span>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {/* CMS Modules */}
        {cmsModules.map((item) => {
          const Icon = getIcon(item.icon);
          const isActive = item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-accent/10 text-accent"
                  : "text-text-secondary hover:bg-bg-hover hover:text-foreground"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {/* Resource pages (from grit generate) */}
        {resourceItems.length > 0 && isAdmin && (
          <>
            {!collapsed && (
              <p className="px-3 mt-6 mb-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                Resources
              </p>
            )}
            {collapsed && <div className="my-3 mx-3 border-t border-border" />}
            {resourceItems.map((item) => {
              const Icon = getIcon(item.icon);
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onMobileClose}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "text-text-secondary hover:bg-bg-hover hover:text-foreground"
                  } ${collapsed ? "justify-center" : ""}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </>
        )}

        {/* Profile link */}
        {(() => {
          const ProfileIcon = getIcon(profileItem.icon);
          const isProfileActive = pathname === profileItem.href;
          return (
            <Link
              href={profileItem.href}
              onClick={onMobileClose}
              title={collapsed ? profileItem.label : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isProfileActive
                  ? "bg-accent/10 text-accent"
                  : "text-text-secondary hover:bg-bg-hover hover:text-foreground"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <ProfileIcon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{profileItem.label}</span>}
            </Link>
          );
        })()}

        {/* System section */}
        {isAdmin && (
          <>
            {!collapsed && (
              <p className="px-3 mt-6 mb-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                System
              </p>
            )}
            {collapsed && <div className="my-3 mx-3 border-t border-border" />}
            {systemItems.map((item) => {
              const Icon = getIcon(item.icon);
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onMobileClose}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "text-text-secondary hover:bg-bg-hover hover:text-foreground"
                  } ${collapsed ? "justify-center" : ""}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border p-3 space-y-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-foreground transition-colors ${collapsed ? "justify-center" : ""}`}
          title={collapsed ? (theme === "dark" ? "Light mode" : "Dark mode") : undefined}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 shrink-0" />
          ) : (
            <Moon className="h-4 w-4 shrink-0" />
          )}
          {!collapsed && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
        </button>

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={onToggle}
          className="hidden lg:flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-foreground transition-colors justify-center"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>

        {/* User avatar menu */}
        <UserMenu user={user} collapsed={collapsed} fullName={fullName} />
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 hidden lg:flex flex-col bg-bg-secondary border-r border-border transition-all duration-300 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-bg-secondary border-r border-border lg:hidden transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
