"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, Package, CheckCircle, Loader2, FileText } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMyPurchase } from "@/hooks/use-purchases";

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PurchaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = typeof params.orderId === "string" ? parseInt(params.orderId, 10) : 0;
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: purchase, isLoading } = useMyPurchase(orderId);

  if (authLoading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <Loader2 className="h-8 w-8 text-accent animate-spin mx-auto" />
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push(`/auth/login?redirect=/purchases/${orderId}`);
    return null;
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <Loader2 className="h-8 w-8 text-accent animate-spin mx-auto" />
        <p className="mt-4 text-text-secondary">Loading purchase details...</p>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-elevated border border-border">
          <Package className="h-8 w-8 text-text-muted" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Purchase not found</h1>
        <p className="mt-2 text-text-secondary">This purchase does not exist or you don&apos;t have access.</p>
        <Link
          href="/purchases"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Purchases
        </Link>
      </div>
    );
  }

  const allFiles = purchase.items.flatMap((item) =>
    (item.product?.downloadable_files || []).map((file) => ({
      ...file,
      productName: item.product?.name || "Product",
    }))
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      {/* Back link */}
      <Link
        href="/purchases"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Purchases
      </Link>

      {/* Order summary */}
      <div className="rounded-xl border border-border bg-bg-elevated p-6 mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Order Details</h1>
            <p className="mt-1 text-sm text-text-muted font-mono">{purchase.order.order_number}</p>
          </div>
          <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400 flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5" />
            Paid
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-text-muted">Date</span>
            <p className="mt-0.5 text-foreground">
              {purchase.order.paid_at ? formatDate(purchase.order.paid_at) : formatDate(purchase.order.created_at)}
            </p>
          </div>
          <div>
            <span className="text-text-muted">Total</span>
            <p className="mt-0.5 text-foreground font-semibold">
              {formatCurrency(purchase.order.total, purchase.order.currency)}
            </p>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="rounded-xl border border-border bg-bg-elevated p-6 mb-8">
        <h2 className="text-sm font-semibold text-foreground mb-4">Items</h2>
        <div className="divide-y divide-border">
          {purchase.items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
              <div className="h-14 w-14 rounded-lg bg-bg-hover overflow-hidden flex-shrink-0">
                {item.product?.images?.[0] ? (
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Package className="h-6 w-6 text-text-muted" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{item.product?.name || "Product"}</p>
                <p className="text-xs text-text-muted">
                  Qty: {item.quantity} &middot; {formatCurrency(item.unit_price, purchase.order.currency)}
                </p>
              </div>
              <div className="text-sm font-medium text-foreground">
                {formatCurrency(item.total, purchase.order.currency)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Downloadable files */}
      {allFiles.length > 0 && (
        <div className="rounded-xl border border-border bg-bg-elevated p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Download className="h-4 w-4 text-accent" />
            Downloadable Files
          </h2>
          <div className="space-y-1">
            {allFiles.map((file, idx) => (
              <a
                key={idx}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-bg-hover transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 text-text-muted flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                    {purchase.items.length > 1 && (
                      <p className="text-xs text-text-muted truncate">{file.productName}</p>
                    )}
                  </div>
                </div>
                <Download className="h-4 w-4 text-text-muted group-hover:text-accent transition-colors flex-shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
