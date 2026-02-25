"use client";

import { useState } from "react";
import type { ResourceDefinition, ColumnDefinition } from "@/lib/resource";
import { Search, Plus, Trash2, Download, Columns3 } from "@/lib/icons";

interface TableToolbarProps {
  resource: ResourceDefinition;
  search: string;
  onSearch: (value: string) => void;
  selectedCount: number;
  onBulkDelete?: () => void;
  onCreate?: () => void;
  allColumns: ColumnDefinition[];
  hiddenColumns: string[];
  onToggleColumn: (key: string) => void;
  data?: Record<string, unknown>[];
}

export function TableToolbar({
  resource,
  search,
  onSearch,
  selectedCount,
  onBulkDelete,
  onCreate,
  allColumns,
  hiddenColumns,
  onToggleColumn,
  data,
}: TableToolbarProps) {
  const [columnsOpen, setColumnsOpen] = useState(false);

  const handleExport = (format: "csv" | "json") => {
    if (!data || data.length === 0) return;

    if (format === "json") {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      downloadBlob(blob, `${resource.slug}.json`);
    } else {
      const headers = allColumns.map((c) => c.label).join(",");
      const rows = data.map((row) =>
        allColumns.map((c) => {
          const val = row[c.key];
          return typeof val === "string" && val.includes(",") ? `"${val}"` : String(val ?? "");
        }).join(",")
      );
      const csv = [headers, ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      downloadBlob(blob, `${resource.slug}.csv`);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
      {/* Search */}
      {resource.table.searchable && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-tertiary px-3 py-2">
          <Search className="h-4 w-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={resource.table.searchPlaceholder ?? "Search..."}
            className="w-48 bg-transparent text-sm text-foreground placeholder:text-text-muted focus:outline-none"
          />
        </div>
      )}

      <div className="flex-1" />

      {/* Bulk actions */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary">
            {selectedCount} selected
          </span>
          {resource.table.bulkActions?.includes("delete") && onBulkDelete && (
            <button
              onClick={onBulkDelete}
              className="flex items-center gap-1.5 rounded-lg bg-danger/10 px-3 py-1.5 text-sm text-danger hover:bg-danger/20 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          )}
          {resource.table.bulkActions?.includes("export") && (
            <button
              onClick={() => handleExport("csv")}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
          )}
        </div>
      )}

      {/* Column visibility */}
      <div className="relative">
        <button
          onClick={() => setColumnsOpen(!columnsOpen)}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover transition-colors"
          title="Toggle columns"
        >
          <Columns3 className="h-3.5 w-3.5" />
        </button>

        {columnsOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setColumnsOpen(false)} />
            <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-border bg-bg-elevated shadow-lg z-50 p-2">
              {allColumns.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-bg-hover cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={!hiddenColumns.includes(col.key)}
                    onChange={() => onToggleColumn(col.key)}
                    className="h-3.5 w-3.5 rounded border-border bg-bg-tertiary accent-accent"
                  />
                  {col.label}
                </label>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Export */}
      {resource.table.actions?.includes("export") && (
        <button
          onClick={() => handleExport("csv")}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
      )}

      {/* Create button */}
      {onCreate && (
        <button
          onClick={onCreate}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New {resource.label?.singular ?? resource.name}
        </button>
      )}
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
