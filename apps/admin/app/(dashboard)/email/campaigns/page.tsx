"use client";

import { useState } from "react";
import Link from "next/link";
import { useEmailCampaigns, useDeleteEmailCampaign } from "@/hooks/use-email";
import { Plus, Trash2, Pencil, Search, Loader2 } from "@/lib/icons";
import { useConfirm } from "@/hooks/use-confirm";

const STATUSES = ["draft", "scheduled", "sending", "sent", "cancelled"] as const;

const statusBadge: Record<string, string> = {
  draft: "bg-bg-elevated text-text-muted",
  scheduled: "bg-accent/10 text-accent",
  sending: "bg-warning/10 text-warning",
  sent: "bg-success/10 text-success",
  cancelled: "bg-danger/10 text-danger",
};

export default function CampaignsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading } = useEmailCampaigns({
    page,
    pageSize: 20,
    status: statusFilter || undefined,
  });
  const { mutate: deleteCampaign } = useDeleteEmailCampaign();
  const confirm = useConfirm();

  const campaigns = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campaigns</h1>
          <p className="text-text-secondary mt-1">Create and manage email campaigns.</p>
        </div>
        <Link
          href="/email/campaigns/new"
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Campaign
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

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
                <th className="px-4 py-3 text-left font-medium text-text-muted">Name</th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Subject</th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Status</th>
                <th className="px-4 py-3 text-left font-medium text-text-muted">Sent At</th>
                <th className="px-4 py-3 text-right font-medium text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr
                  key={campaign.id}
                  className="border-b border-border/50 hover:bg-bg-hover transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/email/campaigns/${campaign.id}`}
                      className="font-medium text-foreground hover:text-accent"
                    >
                      {campaign.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{campaign.subject || "---"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[campaign.status] ?? "bg-bg-elevated text-text-muted"}`}
                    >
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {campaign.sent_at
                      ? new Date(campaign.sent_at).toLocaleString()
                      : "---"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/email/campaigns/${campaign.id}`}
                        className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      {campaign.status !== "sending" && (
                        <button
                          onClick={async () => {
                            const ok = await confirm({ title: "Delete Campaign", description: "Delete this campaign? This cannot be undone.", confirmLabel: "Delete", variant: "danger" });
                            if (ok) deleteCampaign(campaign.id);
                          }}
                          className="rounded-lg p-1.5 text-text-muted hover:bg-danger/10 hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {campaigns.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-text-muted"
                  >
                    No campaigns found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {meta && meta.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-text-muted">{meta.total} total</p>
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
