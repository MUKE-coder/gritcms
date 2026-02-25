"use client";

import { useState, useEffect } from "react";
import { Shield, ExternalLink, AlertTriangle } from "@/lib/icons";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function SecurityPage() {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Check if sentinel is reachable
    fetch(`${API_URL}/sentinel/api/auth/verify`, { method: "GET" })
      .then(() => setLoaded(true))
      .catch(() => setError(true));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Security Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1">
            WAF, rate limiting, threat detection, and anomaly monitoring powered by Sentinel
          </p>
        </div>
        <a
          href={`${API_URL}/sentinel/ui`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg-secondary px-4 py-2.5 text-sm font-medium text-foreground hover:bg-bg-hover transition-colors"
        >
          Open in new tab
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      {error ? (
        <div className="rounded-xl border border-warning/20 bg-warning/5 p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-warning mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Sentinel Not Available</h2>
          <p className="text-sm text-text-secondary max-w-md mx-auto">
            The Sentinel security dashboard could not be reached. Make sure your API server is running
            and <code className="text-xs font-mono bg-bg-secondary px-1.5 py-0.5 rounded">SENTINEL_ENABLED=true</code> is set in your <code className="text-xs font-mono bg-bg-secondary px-1.5 py-0.5 rounded">.env</code> file.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden" style={{ height: "calc(100vh - 200px)" }}>
          <iframe
            src={`${API_URL}/sentinel/ui`}
            className="w-full h-full border-0"
            title="Sentinel Security Dashboard"
            onLoad={() => setLoaded(true)}
          />
        </div>
      )}
    </div>
  );
}
