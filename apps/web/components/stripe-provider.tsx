"use client";

import { useState, useEffect } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

function getStripe(publishableKey: string): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

interface StripeProviderProps {
  clientSecret: string;
  publishableKey: string;
  children: React.ReactNode;
}

export function StripeProvider({
  clientSecret,
  publishableKey,
  children,
}: StripeProviderProps) {
  const [stripe, setStripe] = useState<Stripe | null>(null);

  useEffect(() => {
    getStripe(publishableKey).then(setStripe);
  }, [publishableKey]);

  if (!stripe) return null;

  return (
    <Elements
      stripe={stripe}
      options={{
        clientSecret,
        appearance: {
          theme: "night",
          variables: {
            colorPrimary: "var(--accent, #6c5ce7)",
            borderRadius: "8px",
          },
        },
      }}
    >
      {children}
    </Elements>
  );
}
