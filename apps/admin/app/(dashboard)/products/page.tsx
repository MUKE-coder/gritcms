"use client";

import { useState } from "react";
import Link from "next/link";
import { useConfirm } from "@/hooks/use-confirm";
import {
  useProducts,
  useDeleteProduct,
  useCreateProduct,
  useRevenueDashboard,
} from "@/hooks/use-commerce";
import {
  Plus,
  Trash2,
  Pencil,
  Search,
  Loader2,
  ShoppingBag,
  Package,
  X,
  DollarSign,
  ShoppingCart,
  CreditCard,
} from "@/lib/icons";
import type { Product } from "@repo/shared/types";

const STATUSES = ["active", "inactive", "archived"] as const;
const PRODUCT_TYPES = ["digital", "physical", "course", "membership", "service"] as const;

const statusBadge: Record<string, string> = {
  active: "bg-success/10 text-success",
  inactive: "bg-warning/10 text-warning",
  archived: "bg-bg-elevated text-text-muted",
};

const typeBadge: Record<string, string> = {
  digital: "bg-accent/10 text-accent",
  physical: "bg-success/10 text-success",
  course: "bg-warning/10 text-warning",
  membership: "bg-purple-500/10 text-purple-400",
  service: "bg-cyan-500/10 text-cyan-400",
};

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newType, setNewType] = useState<Product["type"]>("digital");
  const [newStatus, setNewStatus] = useState<Product["status"]>("active");

  const { data, isLoading } = useProducts({
    page,
    pageSize: 20,
    status: statusFilter || undefined,
    search: search || undefined,
  });
  const { mutate: deleteProduct } = useDeleteProduct();
  const { mutate: createProduct, isPending: isCreating } = useCreateProduct();
  const { data: dashboard } = useRevenueDashboard();
  const confirm = useConfirm();

  const products = data?.data ?? [];
  const meta = data?.meta;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    createProduct(
      {
        name: newName,
        description: newDescription,
        type: newType,
        status: newStatus,
      },
      {
        onSuccess: () => {
          setShowCreate(false);
          setNewName("");
          setNewDescription("");
          setNewType("digital");
          setNewStatus("active");
        },
      }
    );
  };

  const stats = [
    {
      label: "Total Revenue",
      value: dashboard ? formatCurrency(dashboard.total_revenue) : "--",
      icon: DollarSign,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Total Orders",
      value: dashboard?.total_orders ?? "--",
      icon: ShoppingCart,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      label: "Active Products",
      value: dashboard?.total_products ?? "--",
      icon: Package,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      label: "Active Subscriptions",
      value: dashboard?.active_subscriptions ?? "--",
      icon: CreditCard,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-bg-secondary p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-muted">{stat.label}</p>
              <div className={`rounded-lg p-2 ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products</h1>
          <p className="text-text-secondary mt-1">
            Manage your products, pricing, and inventory.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Product
        </button>
      </div>

      {/* Search + Status Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg-secondary py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </form>

        <div className="flex items-center gap-1 rounded-lg border border-border bg-bg-secondary p-1">
          <button
            onClick={() => {
              setStatusFilter("");
              setPage(1);
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === ""
                ? "bg-accent text-white"
                : "text-text-muted hover:text-foreground hover:bg-bg-hover"
            }`}
          >
            All
          </button>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                statusFilter === s
                  ? "bg-accent text-white"
                  : "text-text-muted hover:text-foreground hover:bg-bg-hover"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Create Product Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-bg-elevated p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Create Product
              </h2>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg p-1 text-text-muted hover:bg-bg-hover hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Name
              </label>
              <input
                type="text"
                placeholder="Product name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Description
              </label>
              <textarea
                placeholder="Product description (optional)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Type
              </label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as Product["type"])}
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              >
                {PRODUCT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Status
              </label>
              <select
                value={newStatus}
                onChange={(e) =>
                  setNewStatus(e.target.value as Product["status"])
                }
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || isCreating}
                className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
              >
                {isCreating && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-elevated">
                <th className="px-4 py-3 text-left font-medium text-text-muted">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">
                  Type
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">
                  Price
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">
                  Sales
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">
                  Created
                </th>
                <th className="px-4 py-3 text-right font-medium text-text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const firstPrice = product.prices?.[0];
                const thumbnail =
                  product.images && product.images.length > 0
                    ? product.images[0]
                    : null;

                return (
                  <tr
                    key={product.id}
                    className="border-b border-border/50 hover:bg-bg-hover transition-colors"
                  >
                    {/* Name with thumbnail */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-bg-elevated overflow-hidden">
                          {thumbnail ? (
                            <img
                              src={thumbnail}
                              alt={product.name}
                              className="h-10 w-10 object-cover"
                            />
                          ) : (
                            <Package className="h-5 w-5 text-text-muted" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/products/${product.id}`}
                            className="font-medium text-foreground hover:text-accent truncate block"
                          >
                            {product.name}
                          </Link>
                          {product.description && (
                            <p className="text-xs text-text-muted truncate max-w-xs">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Type badge */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          typeBadge[product.type] ?? "bg-bg-elevated text-text-muted"
                        }`}
                      >
                        {product.type}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3 text-text-secondary">
                      {firstPrice
                        ? formatCurrency(firstPrice.amount, firstPrice.currency)
                        : "N/A"}
                    </td>

                    {/* Sales */}
                    <td className="px-4 py-3 text-text-secondary">
                      {product.sales_count ?? 0}
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          statusBadge[product.status] ??
                          "bg-bg-elevated text-text-muted"
                        }`}
                      >
                        {product.status}
                      </span>
                    </td>

                    {/* Created date */}
                    <td className="px-4 py-3 text-text-muted">
                      {new Date(product.created_at).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/products/${product.id}`}
                          className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={async () => {
                            const ok = await confirm({
                              title: "Delete Product",
                              description: "Delete this product? This cannot be undone.",
                              confirmLabel: "Delete",
                              variant: "danger",
                            });
                            if (ok) deleteProduct(product.id);
                          }}
                          className="rounded-lg p-1.5 text-text-muted hover:bg-danger/10 hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <ShoppingBag className="h-8 w-8 text-text-muted" />
                      <p className="text-text-muted">No products found.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {meta && meta.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-text-muted">
                {meta.total} total product{meta.total !== 1 ? "s" : ""}
              </p>
              <div className="flex gap-1">
                {Array.from({ length: meta.pages }, (_, i) => i + 1).map(
                  (p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`rounded-lg px-3 py-1 text-sm ${
                        p === page
                          ? "bg-accent text-white"
                          : "text-text-muted hover:bg-bg-hover"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
