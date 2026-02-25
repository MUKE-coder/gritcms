"use client";

import type { ResourceDefinition } from "@/lib/resource";
import { FormBuilder } from "./form-builder";
import { useCreateResource, useUpdateResource } from "@/hooks/use-resource";
import { X } from "@/lib/icons";

interface FormModalProps {
  resource: ResourceDefinition;
  item: Record<string, unknown> | null;
  onClose: () => void;
}

export function FormModal({ resource, item, onClose }: FormModalProps) {
  const isEdit = item !== null;
  const { mutate: create, isPending: isCreating } = useCreateResource(resource.endpoint);
  const { mutate: update, isPending: isUpdating } = useUpdateResource(resource.endpoint);

  const handleSubmit = (data: Record<string, unknown>) => {
    if (isEdit) {
      update(
        { id: Number(item.id), body: data },
        { onSuccess: () => onClose() }
      );
    } else {
      create(data, { onSuccess: () => onClose() });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-bg-secondary shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            {isEdit ? "Edit" : "Create"} {resource.label?.singular ?? resource.name}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-text-secondary hover:bg-bg-hover hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <FormBuilder
            form={resource.form}
            defaultValues={isEdit ? (item as Record<string, unknown>) : undefined}
            onSubmit={handleSubmit}
            onCancel={onClose}
            isSubmitting={isCreating || isUpdating}
            submitLabel={isEdit ? "Update" : "Create"}
          />
        </div>
      </div>
    </div>
  );
}
