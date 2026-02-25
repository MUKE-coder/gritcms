"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ArrowLeft, Award, CheckCircle, XCircle, Loader2 } from "lucide-react";
import type { Certificate } from "@repo/shared/types";

export default function VerifyCertificatePage() {
  const params = useParams();
  const certNumber = typeof params.number === "string" ? params.number : "";

  const { data: cert, isLoading, error } = useQuery({
    queryKey: ["certificate-verify", certNumber],
    queryFn: async () => {
      const { data } = await api.get(`/api/certificates/verify/${certNumber}`);
      return data.data as Certificate;
    },
    enabled: !!certNumber,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto" />
        <p className="mt-4 text-text-secondary">Verifying certificate...</p>
      </div>
    );
  }

  if (error || !cert) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
          <XCircle className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Certificate Not Found</h1>
        <p className="mt-2 text-text-secondary">
          The certificate number <span className="font-mono text-foreground">{certNumber}</span> could not be verified.
          It may be invalid or has been revoked.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 text-sm text-accent hover:text-accent-hover transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-24">
      <div className="rounded-xl border border-border bg-bg-elevated p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
          <CheckCircle className="h-8 w-8 text-green-400" />
        </div>

        <h1 className="text-2xl font-bold text-foreground">Certificate Verified</h1>
        <p className="mt-2 text-text-secondary">
          This certificate is valid and authentic.
        </p>

        <div className="mt-8 rounded-lg bg-bg-secondary border border-border p-6 text-left space-y-4">
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider">Certificate Number</p>
            <p className="mt-1 font-mono font-semibold text-foreground">{cert.certificate_number}</p>
          </div>

          {cert.contact && (
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider">Awarded To</p>
              <p className="mt-1 font-semibold text-foreground">
                {cert.contact.first_name} {cert.contact.last_name}
              </p>
            </div>
          )}

          {cert.course && (
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider">Course</p>
              <p className="mt-1 font-semibold text-foreground">{cert.course.title}</p>
            </div>
          )}

          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider">Issued On</p>
            <p className="mt-1 font-semibold text-foreground">
              {new Date(cert.issued_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-text-muted">
          <Award className="h-3.5 w-3.5" />
          Verified by GritCMS
        </div>
      </div>
    </div>
  );
}
