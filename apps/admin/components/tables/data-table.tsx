"use client";

import type { ColumnDefinition } from "@/lib/resource";
import { ColumnHeader } from "./column-header";
import { renderCell } from "./cell-renderers";
import { TableSkeleton } from "./table-skeleton";
import { TableEmptyState } from "./table-empty-state";
import { Eye } from "@/lib/icons";

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  if (!path.includes(".")) return obj[path];
  return path.split(".").reduce<unknown>(
    (acc, key) => acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined,
    obj
  );
}

interface DataTableProps {
  columns: ColumnDefinition[];
  data: Record<string, unknown>[];
  isLoading?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string) => void;
  selectedRows?: number[];
  onSelectRows?: (rows: number[]) => void;
  onView?: (item: Record<string, unknown>) => void;
  onEdit?: (item: Record<string, unknown>) => void;
  onDelete?: (id: number) => void;
}

export function DataTable({
  columns,
  data,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  selectedRows = [],
  onSelectRows,
  onView,
  onEdit,
  onDelete,
}: DataTableProps) {
  if (isLoading) {
    return <TableSkeleton columns={columns.length + (onSelectRows ? 1 : 0) + (onView || onEdit || onDelete ? 1 : 0)} />;
  }

  if (data.length === 0) {
    return <TableEmptyState />;
  }

  const allIds = data.map((row) => Number(row.id));
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedRows.includes(id));

  const toggleAll = () => {
    if (!onSelectRows) return;
    onSelectRows(allSelected ? [] : allIds);
  };

  const toggleRow = (id: number) => {
    if (!onSelectRows) return;
    onSelectRows(
      selectedRows.includes(id)
        ? selectedRows.filter((r) => r !== id)
        : [...selectedRows, id]
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {onSelectRows && (
              <th className="w-[48px] px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-border bg-bg-tertiary accent-accent"
                />
              </th>
            )}
            {columns.map((col) => (
              <ColumnHeader
                key={col.key}
                column={col}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
            ))}
            {(onView || onEdit || onDelete) && (
              <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider w-[140px]">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => {
            const id = Number(row.id);
            const isSelected = selectedRows.includes(id);

            return (
              <tr
                key={id || idx}
                className={`border-b border-border/50 transition-colors ${
                  isSelected ? "bg-accent/5" : "hover:bg-bg-hover/50"
                }`}
              >
                {onSelectRows && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRow(id)}
                      className="h-4 w-4 rounded border-border bg-bg-tertiary accent-accent"
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="px-4 py-3 text-sm text-foreground"
                    style={col.width ? { width: col.width } : undefined}
                  >
                    {renderCell(col, getNestedValue(row, col.key), row)}
                  </td>
                ))}
                {(onView || onEdit || onDelete) && (
                  <td className="px-4 py-3 text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                      {onView && (
                        <button
                          onClick={() => onView(row)}
                          className="rounded-md p-1.5 text-text-secondary hover:text-info hover:bg-info/10 transition-colors"
                          title="View"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {onEdit && (
                        <button
                          onClick={() => onEdit(row)}
                          className="text-xs text-text-secondary hover:text-accent transition-colors"
                        >
                          Edit
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(id)}
                          className="text-xs text-text-secondary hover:text-danger transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
