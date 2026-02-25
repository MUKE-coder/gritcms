"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ResourceDefinition } from "@/lib/resource";
import { useResource, useDeleteResource, useBulkDeleteResource } from "@/hooks/use-resource";
import { DataTable } from "@/components/tables/data-table";
import { TableToolbar } from "@/components/tables/table-toolbar";
import { TablePagination } from "@/components/tables/table-pagination";
import { TableFilters } from "@/components/tables/table-filters";
import { FormModal } from "@/components/forms/form-modal";
import { FormPage } from "@/components/forms/form-page";
import { FormModalSteps } from "@/components/forms/form-modal-steps";
import { FormPageSteps } from "@/components/forms/form-page-steps";
import { ViewModal } from "@/components/resource/view-modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";

interface ResourcePageProps {
  resource: ResourceDefinition;
}

export function ResourcePage({ resource }: ResourcePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFormPage = resource.formView === "page" || resource.formView === "page-steps";
  const isSteps = resource.formView === "modal-steps" || resource.formView === "page-steps";
  const formAction = searchParams.get("action");

  // If formView is "page" or "page-steps" and we have an action param, show the form page
  if (isFormPage && (formAction === "create" || formAction === "edit")) {
    return isSteps ? <FormPageSteps resource={resource} /> : <FormPage resource={resource} />;
  }

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(resource.table.pageSize ?? 20);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState(resource.table.defaultSort?.key ?? "");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    resource.table.defaultSort?.direction ?? "desc"
  );
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);

  // Form modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null);

  // View modal state
  const [viewingItem, setViewingItem] = useState<Record<string, unknown> | null>(null);

  // Confirm modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  // Data fetching
  const { data, isLoading } = useResource(resource.endpoint, {
    page,
    pageSize,
    search,
    sortBy,
    sortOrder,
    filters,
  });

  const { mutate: deleteItem, isPending: isDeleting } = useDeleteResource(resource.endpoint);
  const { mutate: bulkDelete, isPending: isBulkDeleting } = useBulkDeleteResource(resource.endpoint);

  // Visible columns
  const visibleColumns = useMemo(
    () => resource.table.columns.filter((col) => !col.hidden && !hiddenColumns.includes(col.key)),
    [resource.table.columns, hiddenColumns]
  );

  // Handlers
  const handleSort = useCallback(
    (key: string) => {
      if (sortBy === key) {
        setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(key);
        setSortOrder("asc");
      }
      setPage(1);
    },
    [sortBy]
  );

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleFilter = useCallback((key: string, value: string) => {
    setFilters((prev) => {
      if (!value) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
    setPage(1);
  }, []);

  const handleView = useCallback((item: Record<string, unknown>) => {
    setViewingItem(item);
  }, []);

  const handleEdit = useCallback((item: Record<string, unknown>) => {
    if (isFormPage) {
      router.push(`/resources/${resource.slug}?action=edit&edit=${item.id}`);
    } else {
      setEditingItem(item);
      setFormOpen(true);
    }
  }, [isFormPage, router, resource.slug]);

  const handleCreate = useCallback(() => {
    if (isFormPage) {
      router.push(`/resources/${resource.slug}?action=create`);
    } else {
      setEditingItem(null);
      setFormOpen(true);
    }
  }, [isFormPage, router, resource.slug]);

  const handleDelete = useCallback((id: number) => {
    setDeletingId(id);
    setConfirmOpen(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (deletingId !== null) {
      deleteItem(deletingId, {
        onSuccess: () => {
          setConfirmOpen(false);
          setDeletingId(null);
        },
      });
    }
  }, [deleteItem, deletingId]);

  const handleBulkDelete = useCallback(() => {
    if (selectedRows.length > 0) {
      setBulkConfirmOpen(true);
    }
  }, [selectedRows]);

  const confirmBulkDelete = useCallback(() => {
    bulkDelete(selectedRows, {
      onSuccess: () => {
        setBulkConfirmOpen(false);
        setSelectedRows([]);
      },
    });
  }, [bulkDelete, selectedRows]);

  const handleFormClose = useCallback(() => {
    setFormOpen(false);
    setEditingItem(null);
  }, []);

  const actions = resource.table.actions ?? ["create", "view", "edit", "delete"];
  const singularName = resource.label?.singular ?? resource.name;
  const pluralName = resource.label?.plural ?? resource.slug;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{pluralName}</h1>
        <p className="text-text-secondary mt-1">
          Manage {pluralName.toLowerCase()}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-bg-secondary">
        <TableToolbar
          resource={resource}
          search={search}
          onSearch={handleSearch}
          selectedCount={selectedRows.length}
          onBulkDelete={handleBulkDelete}
          onCreate={actions.includes("create") ? handleCreate : undefined}
          allColumns={resource.table.columns}
          hiddenColumns={hiddenColumns}
          onToggleColumn={(key) =>
            setHiddenColumns((prev) =>
              prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
            )
          }
          data={data?.data}
        />

        {resource.table.filters && resource.table.filters.length > 0 && (
          <TableFilters
            filters={resource.table.filters}
            values={filters}
            onChange={handleFilter}
          />
        )}

        <DataTable
          columns={visibleColumns}
          data={data?.data ?? []}
          isLoading={isLoading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          selectedRows={selectedRows}
          onSelectRows={setSelectedRows}
          onView={actions.includes("view") ? handleView : undefined}
          onEdit={actions.includes("edit") ? handleEdit : undefined}
          onDelete={actions.includes("delete") ? handleDelete : undefined}
        />

        <TablePagination
          page={page}
          pageSize={pageSize}
          total={data?.meta?.total ?? 0}
          totalPages={data?.meta?.pages ?? 1}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>

      {!isFormPage && formOpen && (
        isSteps ? (
          <FormModalSteps
            resource={resource}
            item={editingItem}
            onClose={handleFormClose}
          />
        ) : (
          <FormModal
            resource={resource}
            item={editingItem}
            onClose={handleFormClose}
          />
        )
      )}

      {viewingItem && (
        <ViewModal
          resource={resource}
          item={viewingItem}
          onClose={() => setViewingItem(null)}
          onEdit={actions.includes("edit") ? handleEdit : undefined}
        />
      )}

      <ConfirmModal
        open={confirmOpen}
        onConfirm={confirmDelete}
        onCancel={() => { setConfirmOpen(false); setDeletingId(null); }}
        title={`Delete ${singularName}`}
        description={`Are you sure you want to delete this ${singularName.toLowerCase()}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={isDeleting}
      />

      <ConfirmModal
        open={bulkConfirmOpen}
        onConfirm={confirmBulkDelete}
        onCancel={() => setBulkConfirmOpen(false)}
        title={`Delete ${selectedRows.length} ${pluralName.toLowerCase()}`}
        description={`Are you sure you want to delete ${selectedRows.length} ${pluralName.toLowerCase()}? This action cannot be undone.`}
        confirmLabel="Delete All"
        variant="danger"
        loading={isBulkDeleting}
      />
    </div>
  );
}
