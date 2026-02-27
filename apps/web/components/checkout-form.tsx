"use client";

import { useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Loader2, Lock, CreditCard } from "lucide-react";

interface CheckoutFormProps {
  amount: number;
  currency: string;
  orderId: number;
  onSuccess: (orderId: number) => void;
  onError: (message: string) => void;
}

export function CheckoutForm({
  amount,
  currency,
  orderId,
  onSuccess,
  onError,
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(amount / 100);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success?order_id=${orderId}`,
      },
      redirect: "if_required",
    });

    if (error) {
      onError(error.message ?? "Payment failed");
      setIsProcessing(false);
    } else {
      onSuccess(orderId);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" />
            Pay {formattedAmount}
          </>
        )}
      </button>
      <p className="text-xs text-text-muted text-center flex items-center justify-center gap-1">
        <CreditCard className="h-3.5 w-3.5" />
        Secure payment powered by Stripe
      </p>
    </form>
  );
}
