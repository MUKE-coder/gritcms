"use client";

import { useState } from "react";
import {
  useOrders,
  useUpdateOrderStatus,
  useRefundOrder,
} from "@/hooks/use-commerce";
import {
  Loader2,
  Search,
  X,
  Receipt,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Check,
} from "@/lib/icons";
import type { Order } from "@repo/shared/types";

const STATUS_TABS = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Paid", value: "paid" },
  { label: "Failed", value: "failed" },
  { label: "Refunded", value: "refunded" },
] as const;

const statusBadge: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-400",
  paid: "bg-green-500/10 text-green-400",
  failed: "bg-red-500/10 text-red-400",
  refunded: "bg-red-500/10 text-red-400",
  partially_refunded: "bg-yellow-500/10 text-yellow-400",
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [refundConfirmId, setRefundConfirmId] = useState<number | null>(null);

  const { data, isLoading } = useOrders({
    page,
    pageSize: 20,
    status: statusFilter || undefined,
  });

  const { mutate: updateStatus, isPending: isUpdatingStatus } =
    useUpdateOrderStatus();
  const { mutate: refundOrder, isPending: isRefunding } = useRefundOrder();

  const orders = data?.data ?? [];
  const meta = data?.meta;

  function handleMarkPaid(orderId: number) {
    updateStatus({ orderId, status: "paid" });
  }

  function handleRefund(orderId: number) {
    refundOrder(orderId, {
      onSuccess: () => setRefundConfirmId(null),
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Orders</h1>
        <p className="text-text-secondary mt-1">
          View and manage customer orders.
        </p>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-bg-secondary p-1 w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatusFilter(tab.value);
              setPage(1);
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === tab.value
                ? "bg-accent text-white"
                : "text-text-muted hover:text-foreground hover:bg-bg-hover"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Refund Confirm Modal */}
      {refundConfirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl border border-border bg-bg-elevated p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Confirm Refund
            </h2>
            <p className="text-sm text-text-secondary">
              Are you sure you want to refund this order? This action cannot be
              undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRefundConfirmId(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRefund(refundConfirmId)}
                disabled={isRefunding}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isRefunding && <Loader2 className="h-4 w-4 animate-spin" />}
                Refund Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-elevated">
                <th className="px-4 py-3 text-left font-medium text-text-muted w-8"></th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">
                  Order Number
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">
                  Customer
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">
                  Total
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">
                  Date
                </th>
                <th className="px-4 py-3 text-right font-medium text-text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  isExpanded={expandedId === order.id}
                  onToggle={() =>
                    setExpandedId(expandedId === order.id ? null : order.id)
                  }
                  onMarkPaid={() => handleMarkPaid(order.id)}
                  onRefund={() => setRefundConfirmId(order.id)}
                  isUpdatingStatus={isUpdatingStatus}
                />
              ))}
              {orders.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-text-muted"
                  >
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {meta && meta.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-text-muted">
                {meta.total} total order{meta.total !== 1 ? "s" : ""}
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

// ---------------------------------------------------------------------------
// Order Row with inline expansion
// ---------------------------------------------------------------------------

function OrderRow({
  order,
  isExpanded,
  onToggle,
  onMarkPaid,
  onRefund,
  isUpdatingStatus,
}: {
  order: Order;
  isExpanded: boolean;
  onToggle: () => void;
  onMarkPaid: () => void;
  onRefund: () => void;
  isUpdatingStatus: boolean;
}) {
  const contactName = order.contact
    ? `${order.contact.first_name} ${order.contact.last_name}`.trim()
    : "---";
  const contactEmail = order.contact?.email ?? "";

  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-border/50 hover:bg-bg-hover transition-colors cursor-pointer"
      >
        {/* Expand chevron */}
        <td className="px-4 py-3">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-text-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 text-text-muted" />
          )}
        </td>
        {/* Order Number */}
        <td className="px-4 py-3">
          <span className="font-medium text-foreground font-mono text-xs">
            {order.order_number}
          </span>
        </td>
        {/* Customer */}
        <td className="px-4 py-3">
          <div className="min-w-0">
            <p className="text-foreground truncate">{contactName}</p>
            {contactEmail && (
              <p className="text-xs text-text-muted truncate">{contactEmail}</p>
            )}
          </div>
        </td>
        {/* Status */}
        <td className="px-4 py-3">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
              statusBadge[order.status] ?? "bg-bg-elevated text-text-muted"
            }`}
          >
            {order.status.replace("_", " ")}
          </span>
        </td>
        {/* Total */}
        <td className="px-4 py-3 text-text-secondary font-medium">
          {formatCurrency(order.total, order.currency)}
        </td>
        {/* Date */}
        <td className="px-4 py-3 text-text-muted">
          {new Date(order.created_at).toLocaleDateString()}
        </td>
        {/* Actions */}
        <td className="px-4 py-3">
          <div
            className="flex items-center justify-end gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {order.status === "pending" && (
              <button
                onClick={onMarkPaid}
                disabled={isUpdatingStatus}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 disabled:opacity-50 transition-colors"
                title="Mark as paid"
              >
                <Check className="h-3.5 w-3.5" />
                Mark Paid
              </button>
            )}
            {order.status === "paid" && (
              <button
                onClick={onRefund}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                title="Refund order"
              >
                <DollarSign className="h-3.5 w-3.5" />
                Refund
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded detail row */}
      {isExpanded && (
        <tr className="border-b border-border/50 bg-bg-elevated/50">
          <td colSpan={7} className="px-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Order Items */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-text-muted" />
                  Order Items
                </h3>
                {order.items && order.items.length > 0 ? (
                  <div className="rounded-lg border border-border bg-bg-secondary overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-bg-elevated">
                          <th className="px-3 py-2 text-left font-medium text-text-muted">
                            Product
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-text-muted">
                            Qty
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-text-muted">
                            Unit Price
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-text-muted">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item) => (
                          <tr
                            key={item.id}
                            className="border-b border-border/50"
                          >
                            <td className="px-3 py-2 text-foreground">
                              {item.product?.name ?? "Unknown Product"}
                            </td>
                            <td className="px-3 py-2 text-right text-text-secondary">
                              {item.quantity}
                            </td>
                            <td className="px-3 py-2 text-right text-text-secondary">
                              {formatCurrency(item.unit_price, order.currency)}
                            </td>
                            <td className="px-3 py-2 text-right text-foreground font-medium">
                              {formatCurrency(item.total, order.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">
                    No items available.
                  </p>
                )}
              </div>

              {/* Payment Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-text-muted" />
                  Payment Details
                </h3>
                <div className="rounded-lg border border-border bg-bg-secondary p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-muted">Subtotal</span>
                    <span className="text-text-secondary">
                      {formatCurrency(order.subtotal, order.currency)}
                    </span>
                  </div>
                  {order.discount_amount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-muted">Discount</span>
                      <span className="text-green-400">
                        -{formatCurrency(order.discount_amount, order.currency)}
                      </span>
                    </div>
                  )}
                  {order.tax_amount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-muted">Tax</span>
                      <span className="text-text-secondary">
                        {formatCurrency(order.tax_amount, order.currency)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm font-semibold border-t border-border pt-2">
                    <span className="text-foreground">Total</span>
                    <span className="text-foreground">
                      {formatCurrency(order.total, order.currency)}
                    </span>
                  </div>
                  <div className="border-t border-border pt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-muted">Payment Provider</span>
                      <span className="text-text-secondary capitalize">
                        {order.payment_provider || "---"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-muted">Paid At</span>
                      <span className="text-text-secondary">
                        {order.paid_at
                          ? new Date(order.paid_at).toLocaleString()
                          : "---"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-muted">Currency</span>
                      <span className="text-text-secondary uppercase">
                        {order.currency}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
