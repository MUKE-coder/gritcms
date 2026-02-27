"use client";

import { useState, useRef } from "react";
import { X, Upload, Loader2, Check, AlertCircle, File } from "@/lib/icons";
import type { ImportResult } from "@repo/shared/types";

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImportFile: (file: File) => void;
  onImportEmails: (emails: string) => void;
  isPending: boolean;
  result: ImportResult | null;
  title?: string;
}

type Tab = "file" | "paste";

export function ImportModal({
  open,
  onClose,
  onImportFile,
  onImportEmails,
  isPending,
  result,
  title = "Import",
}: ImportModalProps) {
  const [tab, setTab] = useState<Tab>("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const detectedEmails = pastedText
    .replace(/[;,]/g, "\n")
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.includes("@"));

  function handleClose() {
    setSelectedFile(null);
    setPastedText("");
    setDragOver(false);
    onClose();
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith(".csv") || file.name.endsWith(".xlsx"))) {
      setSelectedFile(file);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  }

  function handleImport() {
    if (tab === "file" && selectedFile) {
      onImportFile(selectedFile);
    } else if (tab === "paste" && pastedText.trim()) {
      onImportEmails(pastedText);
    }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-bg-elevated border border-border rounded-xl shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button
            onClick={handleClose}
            className="p-1 text-text-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Tabs */}
          <div className="flex border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setTab("file")}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                tab === "file"
                  ? "bg-accent text-white"
                  : "bg-bg-secondary text-text-muted hover:bg-bg-hover"
              }`}
            >
              Upload File
            </button>
            <button
              onClick={() => setTab("paste")}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                tab === "paste"
                  ? "bg-accent text-white"
                  : "bg-bg-secondary text-text-muted hover:bg-bg-hover"
              }`}
            >
              Paste Emails
            </button>
          </div>

          {/* Upload File tab */}
          {tab === "file" && (
            <div>
              <div
                onDrop={handleFileDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? "border-accent bg-accent/5"
                    : "border-border hover:border-accent/50 hover:bg-bg-hover/50"
                }`}
              >
                <Upload className="h-8 w-8 mx-auto text-text-muted mb-3" />
                <p className="text-sm font-medium text-foreground">
                  Drop a CSV or Excel file here
                </p>
                <p className="text-xs text-text-muted mt-1">
                  or click to browse
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {selectedFile && (
                <div className="mt-3 flex items-center gap-3 px-3 py-2.5 border border-border rounded-lg bg-bg-secondary">
                  <File className="h-5 w-5 text-accent shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{selectedFile.name}</p>
                    <p className="text-xs text-text-muted">{formatSize(selectedFile.size)}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                    className="p-1 text-text-muted hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <p className="text-xs text-text-muted mt-3">
                Expected columns: <strong>email</strong>, first_name, last_name, phone (email is required)
              </p>
            </div>
          )}

          {/* Paste Emails tab */}
          {tab === "paste" && (
            <div>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={"Paste emails here, one per line or separated by commas:\n\njohn@example.com\njane@example.com\nbob@example.com"}
                className="w-full h-40 rounded-lg border border-border bg-bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-accent resize-none"
              />
              {detectedEmails.length > 0 && (
                <p className="text-xs text-text-muted mt-2">
                  {detectedEmails.length} email{detectedEmails.length !== 1 ? "s" : ""} detected
                </p>
              )}
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="rounded-lg border border-border p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Check className="h-4 w-4 text-green-500" />
                Import complete
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-green-500/10 px-2 py-1.5">
                  <p className="text-lg font-bold text-green-500">{result.created}</p>
                  <p className="text-xs text-text-muted">Created</p>
                </div>
                <div className="rounded-md bg-blue-500/10 px-2 py-1.5">
                  <p className="text-lg font-bold text-blue-500">{result.updated}</p>
                  <p className="text-xs text-text-muted">Updated</p>
                </div>
                <div className="rounded-md bg-zinc-500/10 px-2 py-1.5">
                  <p className="text-lg font-bold text-zinc-400">{result.skipped}</p>
                  <p className="text-xs text-text-muted">Skipped</p>
                </div>
              </div>
              {result.errors && result.errors.length > 0 && (
                <div className="mt-2 rounded-md bg-red-500/10 border border-red-500/20 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-red-400 mb-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {result.errors.length} error{result.errors.length !== 1 ? "s" : ""}
                  </div>
                  <ul className="text-xs text-red-400/80 space-y-0.5 max-h-24 overflow-y-auto">
                    {result.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium border border-border rounded-lg text-text-secondary hover:bg-bg-hover transition-colors"
            >
              {result ? "Close" : "Cancel"}
            </button>
            {!result && (
              <button
                onClick={handleImport}
                disabled={
                  isPending ||
                  (tab === "file" && !selectedFile) ||
                  (tab === "paste" && detectedEmails.length === 0)
                }
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Import
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
