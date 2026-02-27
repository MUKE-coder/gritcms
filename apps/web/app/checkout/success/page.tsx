"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Loader2, XCircle, ShoppingBag, BookOpen } from "lucide-react";
import { useCheckoutStatus } from "@/hooks/use-checkout";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const orderIdParam = searchParams.get("order_id");
  const orderId = orderIdParam ? parseInt(orderIdParam, 10) : null;

  const { data: status, isLoading } = useCheckoutStatus(orderId);

  if (!orderId) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
          <XCircle className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Invalid Order</h1>
        <p className="mt-2 text-text-secondary">
          No order ID was provided. Please try your purchase again.
        </p>
        <Link
          href="/products"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        >
          <ShoppingBag className="h-4 w-4" />
          Browse Products
        </Link>
      </div>
    );
  }

  if (isLoading || !status) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
          <Loader2 className="h-8 w-8 text-accent animate-spin" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Processing Payment</h1>
        <p className="mt-2 text-text-secondary">
          Please wait while we confirm your payment...
        </p>
      </div>
    );
  }

  if (status.status === "failed") {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
          <XCircle className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Payment Failed</h1>
        <p className="mt-2 text-text-secondary">
          Your payment could not be processed. Please try again.
        </p>
        <Link
          href="/products"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        >
          <ShoppingBag className="h-4 w-4" />
          Browse Products
        </Link>
      </div>
    );
  }

  if (status.status === "pending") {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
          <Loader2 className="h-8 w-8 text-accent animate-spin" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Confirming Payment</h1>
        <p className="mt-2 text-text-secondary">
          Your payment is being confirmed. This usually takes a few seconds...
        </p>
      </div>
    );
  }

  // Paid / success
  return (
    <div className="mx-auto max-w-lg px-6 py-24 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
        <CheckCircle className="h-8 w-8 text-green-400" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Payment Successful!</h1>
      <p className="mt-2 text-text-secondary">
        Thank you for your purchase. Your order{" "}
        <span className="font-mono text-foreground">{status.order_number}</span>{" "}
        has been confirmed.
      </p>

      <div className="mt-8 rounded-xl border border-border bg-bg-elevated p-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-muted">Order Number</span>
          <span className="font-mono text-foreground">{status.order_number}</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-3">
          <span className="text-text-muted">Status</span>
          <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
            Paid
          </span>
        </div>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/courses"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        >
          <BookOpen className="h-4 w-4" />
          My Courses
        </Link>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-bg-hover transition-colors"
        >
          <ShoppingBag className="h-4 w-4" />
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-6 py-24 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
            <Loader2 className="h-8 w-8 text-accent animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Loading...</h1>
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}
