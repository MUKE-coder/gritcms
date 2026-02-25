"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { FieldDefinition } from "@/lib/resource";

interface RelationshipSelectFieldProps {
  field: FieldDefinition;
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
}

export function RelationshipSelectField({ field, value, onChange, error }: RelationshipSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const { data: options = [], isLoading } = useQuery({
    queryKey: [field.relatedEndpoint, "options"],
    queryFn: async () => {
      const { data } = await apiClient.get(`${field.relatedEndpoint}?page_size=100`);
      return data.data || data || [];
    },
    enabled: !!field.relatedEndpoint,
  });

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    function handleScroll() { updatePosition(); }
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open, updatePosition]);

  const displayField = field.displayField || "name";

  const filtered = useMemo(() =>
    (options as Record<string, unknown>[]).filter((item) => {
      if (!search) return true;
      const label = String(item[displayField] || item.name || item.title || item.id || "");
      return label.toLowerCase().includes(search.toLowerCase());
    }),
    [options, search, displayField]
  );

  const selectedLabel = useMemo(() => {
    if (!value) return "";
    const found = (options as Record<string, unknown>[]).find((item) => item.id === value);
    if (!found) return String(value);
    return String(found[displayField] || found.name || found.title || found.id || "");
  }, [value, options, displayField]);

  const dropdown = open ? createPortal(
    <div
      ref={dropdownRef}
      className="fixed z-[9999] rounded-md border border-border bg-bg-elevated shadow-lg"
      style={{ top: pos.top, left: pos.left, width: pos.width, backgroundColor: "var(--bg-elevated, #22222e)" }}
    >
      <div className="p-2">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex h-9 w-full rounded-md border border-border bg-bg-secondary px-3 py-1 text-sm text-foreground outline-none placeholder:text-text-secondary"
          style={{ backgroundColor: "var(--bg-secondary, #111118)" }}
          autoFocus
        />
      </div>
      <div className="max-h-60 overflow-y-auto p-1">
        {isLoading ? (
          <div className="px-3 py-2 text-sm text-text-secondary">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="px-3 py-2 text-sm text-text-secondary">No results found</div>
        ) : (
          <>
            {value && (
              <button
                type="button"
                onClick={() => { onChange(null); setOpen(false); setSearch(""); }}
                className="flex w-full items-center rounded-sm px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover"
              >
                Clear selection
              </button>
            )}
            {filtered.map((item) => {
              const id = item.id as number;
              const label = String(item[displayField] || item.name || item.title || item.id || "");
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => { onChange(id); setOpen(false); setSearch(""); }}
                  className={`flex w-full items-center rounded-sm px-3 py-2 text-sm text-foreground hover:bg-bg-hover
                    ${value === id ? "bg-bg-hover font-medium" : ""}`}
                >
                  {label}
                </button>
              );
            })}
          </>
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => { if (!open) updatePosition(); setOpen(!open); }}
        className={`flex h-10 w-full items-center justify-between rounded-md border bg-bg-secondary px-3 py-2 text-sm text-foreground transition-colors
          ${error ? "border-red-500" : "border-border"}
          ${open ? "ring-2 ring-accent" : ""}`}
      >
        <span className={value ? "text-foreground" : "text-text-secondary"}>
          {value ? selectedLabel : `Select ${field.label}...`}
        </span>
        <svg className="h-4 w-4 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {dropdown}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
