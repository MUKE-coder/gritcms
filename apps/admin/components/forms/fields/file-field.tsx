"use client";

import type { FieldDefinition } from "@/lib/resource";
import { Dropzone, type UploadedFile } from "@/components/ui/dropzone";

interface FileFieldProps {
  field: FieldDefinition;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function FileField({ field, value, onChange, error }: FileFieldProps) {
  const existingFiles: UploadedFile[] = value
    ? [{ url: value, name: "Current file", size: 0, type: "application/octet-stream" }]
    : [];

  return (
    <Dropzone
      variant="compact"
      maxFiles={1}
      maxSize={field.maxSize ?? 10 * 1024 * 1024}
      value={existingFiles}
      onFilesChange={(files) => {
        onChange(files[0]?.url || "");
      }}
      label={field.label}
      description={field.description ?? "PDF, CSV, Excel, Word, and more"}
      error={error}
    />
  );
}
