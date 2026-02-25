"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  useEmailCampaign,
  useUpdateEmailCampaign,
  useCreateEmailCampaign,
  useScheduleCampaign,
  useCampaignStats,
  useEmailTemplates,
  useEmailLists,
  useSegments,
} from "@/hooks/use-email";
import { ChevronLeft, Save, Loader2, Play } from "@/lib/icons";

const statusBadge: Record<string, string> = {
  draft: "bg-bg-elevated text-text-muted",
  scheduled: "bg-accent/10 text-accent",
  sending: "bg-warning/10 text-warning",
  sent: "bg-success/10 text-success",
  cancelled: "bg-danger/10 text-danger",
};

export default function CampaignEditorPage() {
  const params = useParams();
  const router = useRouter();

  const isNew = params.id === "new";
  const id = isNew ? 0 : Number(params.id);

  // --- Data fetching ---
  const { data: campaign, isLoading } = useEmailCampaign(id);
  const { data: stats } = useCampaignStats(id);
  const { data: templates } = useEmailTemplates();
  const { data: lists } = useEmailLists();
  const { data: segments } = useSegments();

  const { mutate: updateCampaign, isPending: isUpdating } = useUpdateEmailCampaign();
  const { mutate: createCampaign, isPending: isCreating } = useCreateEmailCampaign();
  const { mutate: scheduleCampaign, isPending: isScheduling } = useScheduleCampaign();

  // --- Form state ---
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [selectedListIds, setSelectedListIds] = useState<number[]>([]);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<number[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Populate form from fetched campaign
  if (campaign && !initialized) {
    setName(campaign.name);
    setSubject(campaign.subject);
    setFromName(campaign.from_name);
    setFromEmail(campaign.from_email);
    setReplyTo(campaign.reply_to);
    setHtmlContent(campaign.html_content);
    setTemplateId(campaign.template_id);
    setSelectedListIds(campaign.list_ids ?? []);
    setSelectedSegmentIds(campaign.segment_ids ?? []);
    if (campaign.scheduled_at) setScheduledAt(campaign.scheduled_at.slice(0, 16));
    setInitialized(true);
  }

  const isSaving = isUpdating || isCreating;
  const isSent = campaign?.status === "sent";
  const isSending = campaign?.status === "sending";
  const isReadOnly = isSent || isSending;

  // --- Handlers ---

  function buildPayload() {
    return {
      name,
      subject,
      from_name: fromName,
      from_email: fromEmail,
      reply_to: replyTo,
      html_content: htmlContent,
      template_id: templateId,
      list_ids: selectedListIds.length > 0 ? selectedListIds : null,
      segment_ids: selectedSegmentIds.length > 0 ? selectedSegmentIds : null,
    };
  }

  function handleSave() {
    if (isNew) {
      createCampaign(buildPayload(), {
        onSuccess: (created) => router.push(`/email/campaigns/${created.id}`),
      });
    } else {
      updateCampaign({ id, ...buildPayload() });
    }
  }

  function handleSendNow() {
    if (!confirm("Send this campaign now? This cannot be undone.")) return;
    if (isNew) return;
    scheduleCampaign({ id });
  }

  function handleSchedule() {
    if (!scheduledAt) return;
    if (!confirm(`Schedule this campaign for ${new Date(scheduledAt).toLocaleString()}?`)) return;
    if (isNew) return;
    scheduleCampaign({ id, scheduledAt: new Date(scheduledAt).toISOString() });
  }

  function toggleListId(listId: number) {
    setSelectedListIds((prev) =>
      prev.includes(listId) ? prev.filter((x) => x !== listId) : [...prev, listId]
    );
  }

  function toggleSegmentId(segId: number) {
    setSelectedSegmentIds((prev) =>
      prev.includes(segId) ? prev.filter((x) => x !== segId) : [...prev, segId]
    );
  }

  // --- Loading state ---
  if (!isNew && isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/email/campaigns"
          className="rounded-lg p-1.5 hover:bg-bg-hover text-text-muted"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">
            {isNew ? "New Campaign" : campaign?.name || "Campaign"}
          </h1>
          {!isNew && campaign && (
            <p className="text-text-secondary mt-1">
              Created {new Date(campaign.created_at).toLocaleDateString()}
            </p>
          )}
        </div>
        {!isReadOnly && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save as Draft"}
          </button>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Campaign details */}
          <div className="rounded-xl border border-border bg-bg-secondary p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Campaign Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Campaign Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isReadOnly}
                  placeholder="e.g. Monthly Newsletter"
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none disabled:opacity-60"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={isReadOnly}
                  placeholder="e.g. Your weekly digest"
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  From Name
                </label>
                <input
                  type="text"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  disabled={isReadOnly}
                  placeholder="e.g. John Doe"
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  From Email
                </label>
                <input
                  type="email"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  disabled={isReadOnly}
                  placeholder="e.g. john@example.com"
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none disabled:opacity-60"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Reply-To
                </label>
                <input
                  type="email"
                  value={replyTo}
                  onChange={(e) => setReplyTo(e.target.value)}
                  disabled={isReadOnly}
                  placeholder="e.g. reply@example.com"
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          {/* HTML Content */}
          <div className="rounded-xl border border-border bg-bg-secondary p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Email Content</h2>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                HTML Content
              </label>
              <textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                disabled={isReadOnly}
                rows={16}
                placeholder="Paste or write your HTML email content here..."
                className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground font-mono focus:border-accent focus:outline-none disabled:opacity-60"
              />
            </div>
          </div>

          {/* Stats (only for sent campaigns) */}
          {isSent && stats && (
            <div className="rounded-xl border border-border bg-bg-secondary p-6 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Campaign Stats</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { label: "Sent", value: stats.sent },
                  { label: "Delivered", value: stats.delivered },
                  { label: "Opened", value: stats.opened },
                  { label: "Clicked", value: stats.clicked },
                  { label: "Bounced", value: stats.bounced },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg border border-border bg-bg-elevated p-4 text-center"
                  >
                    <p className="text-2xl font-bold text-foreground">
                      {stat.value.toLocaleString()}
                    </p>
                    <p className="text-xs text-text-muted mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar (1/3) */}
        <div className="space-y-6">
          {/* Status */}
          {!isNew && campaign && (
            <div className="rounded-xl border border-border bg-bg-secondary p-6 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Status</h3>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[campaign.status] ?? "bg-bg-elevated text-text-muted"}`}
              >
                {campaign.status}
              </span>
              {campaign.scheduled_at && (
                <p className="text-xs text-text-muted">
                  Scheduled: {new Date(campaign.scheduled_at).toLocaleString()}
                </p>
              )}
              {campaign.sent_at && (
                <p className="text-xs text-text-muted">
                  Sent: {new Date(campaign.sent_at).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Template selector */}
          <div className="rounded-xl border border-border bg-bg-secondary p-6 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Template</h3>
            <select
              value={templateId ?? ""}
              onChange={(e) =>
                setTemplateId(e.target.value ? Number(e.target.value) : null)
              }
              disabled={isReadOnly}
              className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none disabled:opacity-60"
            >
              <option value="">No template</option>
              {templates?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Target audience - Lists */}
          <div className="rounded-xl border border-border bg-bg-secondary p-6 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Target Lists</h3>
            {lists && lists.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {lists.map((list) => (
                  <label
                    key={list.id}
                    className="flex items-center gap-2 text-sm text-text-secondary"
                  >
                    <input
                      type="checkbox"
                      checked={selectedListIds.includes(list.id)}
                      onChange={() => toggleListId(list.id)}
                      disabled={isReadOnly}
                      className="rounded border-border"
                    />
                    <span className="truncate">{list.name}</span>
                    {list.subscriber_count != null && (
                      <span className="ml-auto text-xs text-text-muted">
                        {list.subscriber_count.toLocaleString()}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted">No lists available.</p>
            )}
          </div>

          {/* Target audience - Segments */}
          <div className="rounded-xl border border-border bg-bg-secondary p-6 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Target Segments</h3>
            {segments && segments.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {segments.map((seg) => (
                  <label
                    key={seg.id}
                    className="flex items-center gap-2 text-sm text-text-secondary"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSegmentIds.includes(seg.id)}
                      onChange={() => toggleSegmentId(seg.id)}
                      disabled={isReadOnly}
                      className="rounded border-border"
                    />
                    <span className="truncate">{seg.name}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted">No segments available.</p>
            )}
          </div>

          {/* Schedule / Send controls */}
          {!isReadOnly && !isNew && (
            <div className="rounded-xl border border-border bg-bg-secondary p-6 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Send</h3>

              <button
                onClick={handleSendNow}
                disabled={isScheduling}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-medium text-white hover:bg-success/90 disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                {isScheduling ? "Sending..." : "Send Now"}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-bg-secondary px-2 text-xs text-text-muted">or</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-secondary">
                  Schedule for
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                />
                <button
                  onClick={handleSchedule}
                  disabled={!scheduledAt || isScheduling}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-accent px-4 py-2 text-sm font-medium text-accent hover:bg-accent/10 disabled:opacity-50"
                >
                  {isScheduling ? "Scheduling..." : "Schedule"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
