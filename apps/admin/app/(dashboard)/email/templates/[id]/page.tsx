"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useEmailTemplate, useUpdateEmailTemplate, useCreateEmailTemplate } from "@/hooks/use-email";
import { ChevronLeft, Save, Loader2, Eye } from "@/lib/icons";
import Link from "next/link";

export default function EmailTemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const isNew = params.id === "new";
  const id = isNew ? 0 : Number(params.id);

  const { data: template, isLoading } = useEmailTemplate(id);
  const { mutate: updateTemplate, isPending: updating } = useUpdateEmailTemplate();
  const { mutate: createTemplate, isPending: creating } = useCreateEmailTemplate();
  const saving = updating || creating;

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [type, setType] = useState<"campaign" | "sequence" | "transactional">("campaign");
  const [htmlContent, setHtmlContent] = useState("");
  const [textContent, setTextContent] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  if (template && !initialized) {
    setName(template.name);
    setSubject(template.subject);
    setType(template.type);
    setHtmlContent(template.html_content || "");
    setTextContent(template.text_content || "");
    setInitialized(true);
  }

  const handleSave = () => {
    if (isNew) {
      createTemplate(
        { name, subject, type, html_content: htmlContent, text_content: textContent },
        {
          onSuccess: (data) => {
            router.push(`/email/templates/${data.id}`);
          },
        }
      );
    } else {
      updateTemplate({ id, name, subject, type, html_content: htmlContent, text_content: textContent });
    }
  };

  const handlePreview = () => {
    setShowPreview(true);
    setTimeout(() => {
      if (iframeRef.current) {
        const doc = iframeRef.current.contentDocument;
        if (doc) {
          doc.open();
          doc.write(htmlContent);
          doc.close();
        }
      }
    }, 50);
  };

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
        <Link href="/email/templates" className="rounded-lg p-1.5 hover:bg-bg-hover text-text-muted">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">
            {isNew ? "New Template" : template?.name || "Edit Template"}
          </h1>
          <p className="text-text-secondary mt-1">
            {isNew ? "Create a new email template." : "Edit your email template content and settings."}
          </p>
        </div>
        <button
          onClick={handlePreview}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover transition-colors"
        >
          <Eye className="h-4 w-4" />
          Preview
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Two column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column - Settings */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-bg-secondary p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Settings</h2>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Template name"
                className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject line"
                className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "campaign" | "sequence" | "transactional")}
                className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
              >
                <option value="campaign">Campaign</option>
                <option value="sequence">Sequence</option>
                <option value="transactional">Transactional</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right column - Content */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-border bg-bg-secondary p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">HTML Content</h2>
            <textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              placeholder="Paste or write your HTML email content..."
              rows={18}
              className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground font-mono focus:border-accent focus:outline-none resize-y"
            />
          </div>
          <div className="rounded-xl border border-border bg-bg-secondary p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Plain Text Content</h2>
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Plain text fallback for email clients that do not support HTML..."
              rows={8}
              className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm text-foreground font-mono focus:border-accent focus:outline-none resize-y"
            />
          </div>
        </div>
      </div>

      {/* Preview modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-4xl h-[80vh] rounded-xl border border-border bg-bg-elevated flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Email Preview</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="rounded-lg border border-border px-4 py-1.5 text-sm text-text-secondary hover:bg-bg-hover"
              >
                Close
              </button>
            </div>
            <div className="flex-1 p-4">
              <iframe
                ref={iframeRef}
                title="Email preview"
                className="w-full h-full rounded-lg border border-border bg-white"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
