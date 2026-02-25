"use client";

import type { FieldDefinition } from "@/lib/resource";
import { Dropzone, type UploadedFile } from "@/components/ui/dropzone";

interface FilesFieldProps {
  field: FieldDefinition;
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
}

export function FilesField({ field, value, onChange, error }: FilesFieldProps) {
  const existingFiles: UploadedFile[] = (value || []).map((url, i) => ({
    url,
    name: `File ${i + 1}`,
    size: 0,
    type: "application/octet-stream",
  }));

  return (
    <Dropzone
      variant="default"
      maxFiles={field.max ?? 10}
      maxSize={field.maxSize ?? 10 * 1024 * 1024}
      value={existingFiles}
      onFilesChange={(files) => {
        onChange(files.map((f) => f.url));
      }}
      label={field.label}
      description={field.description ?? "Upload up to " + String(field.max ?? 10) + " files"}
      error={error}
    />
  );
}
