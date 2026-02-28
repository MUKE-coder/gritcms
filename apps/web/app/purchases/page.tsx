"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Package, Download, ShoppingBag, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMyPurchases } from "@/hooks/use-purchases";

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function PurchasesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: purchases, isLoading } = useMyPurchases();

  if (authLoading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-24 text-center">
        <Loader2 className="h-8 w-8 text-accent animate-spin mx-auto" />
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push("/auth/login?redirect=/purchases");
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight">My Purchases</h1>
        <p className="mt-3 text-lg text-text-secondary max-w-2xl mx-auto">
          Access your purchased products and download files.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-bg-elevated overflow-hidden animate-pulse">
              <div className="h-48 bg-bg-hover" />
              <div className="p-5 space-y-3">
                <div className="h-3 bg-bg-hover rounded w-1/4" />
                <div className="h-5 bg-bg-hover rounded w-3/4" />
                <div className="h-3 bg-bg-hover rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : purchases && purchases.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {purchases.map((purchase) => {
            const product = purchase.items?.[0]?.product;
            const image = product?.images?.[0];
            const hasFiles = purchase.items?.some(
              (item) => item.product?.downloadable_files && item.product.downloadable_files.length > 0
            );

            return (
              <div
                key={purchase.order.id}
                className="group rounded-xl border border-border bg-bg-elevated overflow-hidden hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300"
              >
                {/* Thumbnail */}
                <div className="h-48 bg-bg-hover overflow-hidden">
                  {image ? (
                    <img
                      src={image}
                      alt={product?.name || "Product"}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-accent/10 to-accent/5">
                      <Package className="h-12 w-12 text-accent/20" />
                    </div>
                  )}
                </div>

                <div className="p-5">
                  {/* Status + amount */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
                      Paid
                    </span>
                    <span className="text-xs text-text-muted">
                      {formatCurrency(purchase.order.total, purchase.order.currency)}
                    </span>
                  </div>

                  {/* Product names */}
                  <h2 className="font-semibold text-lg text-foreground line-clamp-2 leading-snug">
                    {purchase.items.length === 1
                      ? product?.name || "Product"
                      : `${purchase.items.length} items`}
                  </h2>

                  {/* Order meta */}
                  <div className="mt-2 flex items-center gap-4 text-xs text-text-muted">
                    <span className="font-mono">{purchase.order.order_number}</span>
                    {purchase.order.paid_at && (
                      <span>{formatDate(purchase.order.paid_at)}</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex items-center gap-2">
                    {hasFiles && (
                      <Link
                        href={`/purchases/${purchase.order.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download Files
                      </Link>
                    )}
                    <Link
                      href={`/purchases/${purchase.order.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-hover hover:text-foreground transition-colors"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-elevated border border-border">
            <Package className="h-8 w-8 text-text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No purchases yet</h3>
          <p className="mt-1 text-sm text-text-muted">
            Your purchased products will appear here.
          </p>
          <Link
            href="/products"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
          >
            <ShoppingBag className="h-4 w-4" />
            Browse Products
          </Link>
        </div>
      )}
    </div>
  );
}
