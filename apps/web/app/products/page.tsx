"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ShoppingBag, Tag } from "lucide-react";
import { usePublicProducts } from "@/hooks/use-commerce";

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(amount / 100);
}

const typeLabels: Record<string, string> = {
  digital: "Digital",
  physical: "Physical",
  course: "Course",
  membership: "Membership",
  service: "Service",
};

export default function ProductCatalogPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePublicProducts({ page, pageSize: 12 });
  const products = data?.products || [];
  const meta = data?.meta;

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Products</h1>
        <p className="mt-3 text-lg text-text-secondary max-w-2xl mx-auto">
          Browse our collection of digital products, courses, and memberships.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-bg-elevated overflow-hidden animate-pulse">
              <div className="h-48 bg-bg-hover" />
              <div className="p-5 space-y-3">
                <div className="h-3 bg-bg-hover rounded w-1/4" />
                <div className="h-5 bg-bg-hover rounded w-3/4" />
                <div className="h-3 bg-bg-hover rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length > 0 ? (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const firstImage = product.images?.[0];
              const firstPrice = product.prices?.[0];

              return (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="group rounded-xl border border-border bg-bg-elevated overflow-hidden hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300"
                >
                  <div className="h-48 bg-bg-hover overflow-hidden">
                    {firstImage ? (
                      <img
                        src={firstImage}
                        alt={product.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-accent/10 to-accent/5">
                        <ShoppingBag className="h-12 w-12 text-accent/20" />
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                        {typeLabels[product.type] || product.type}
                      </span>
                    </div>

                    <h2 className="font-semibold text-lg text-foreground group-hover:text-accent transition-colors line-clamp-2 leading-snug">
                      {product.name}
                    </h2>

                    {product.description && (
                      <p className="mt-2 text-sm text-text-secondary line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>
                    )}

                    <div className="mt-4 flex items-center justify-between">
                      {firstPrice ? (
                        <span className="text-lg font-bold text-foreground">
                          {formatPrice(firstPrice.amount, firstPrice.currency)}
                          {firstPrice.type === "subscription" && (
                            <span className="text-sm font-normal text-text-muted">
                              /{firstPrice.interval || "mo"}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-sm text-text-muted">Contact for pricing</span>
                      )}
                      <span className="text-xs font-medium text-accent group-hover:text-accent-hover transition-colors">
                        View details &rarr;
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {meta && meta.pages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <div className="flex items-center gap-1 px-3">
                {Array.from({ length: meta.pages }).map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setPage(i + 1)}
                    className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                      page === i + 1
                        ? "bg-accent text-white"
                        : "text-text-secondary hover:bg-bg-hover hover:text-foreground"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
                disabled={page >= meta.pages}
                className="flex items-center gap-1 rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-elevated border border-border">
            <ShoppingBag className="h-8 w-8 text-text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No products available</h3>
          <p className="mt-1 text-sm text-text-muted">Check back soon for new products.</p>
        </div>
      )}
    </div>
  );
}
