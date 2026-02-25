"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Bell, X } from "@/lib/icons";
import { getIcon } from "@/lib/icons";

export interface Notification {
  id: string;
  title: string;
  message: string;
  icon?: string;
  read: boolean;
  created_at: string;
  href?: string;
}

// Placeholder notifications for the shell — will be replaced with API polling
const placeholderNotifications: Notification[] = [];

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(placeholderNotifications);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
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
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const dismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          className="fixed z-[9999] w-80 rounded-xl border border-border bg-bg-elevated shadow-2xl overflow-hidden"
          style={{ top: pos.top, right: pos.right }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-accent hover:text-accent/80 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4">
                <Bell className="h-8 w-8 text-text-muted mb-2" />
                <p className="text-sm text-text-muted">No notifications yet</p>
                <p className="text-xs text-text-muted mt-1">
                  You&apos;re all caught up!
                </p>
              </div>
            ) : (
              notifications.map((notification) => {
                const Icon = notification.icon ? getIcon(notification.icon) : Bell;
                return (
                  <div
                    key={notification.id}
                    className={`flex gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-bg-hover transition-colors cursor-pointer ${
                      !notification.read ? "bg-accent/5" : ""
                    }`}
                    onClick={() => markRead(notification.id)}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 mt-0.5">
                      <Icon className="h-4 w-4 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.read ? "font-medium text-foreground" : "text-text-secondary"}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5 truncate">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-text-muted mt-1">
                        {formatTimeAgo(notification.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dismiss(notification.id);
                      }}
                      className="shrink-0 p-1 text-text-muted hover:text-foreground transition-colors rounded"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => {
          if (!open) updatePosition();
          setOpen(!open);
        }}
        className="relative flex items-center justify-center rounded-lg p-2 text-text-secondary hover:bg-bg-hover hover:text-foreground transition-colors"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {menu}
    </>
  );
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
