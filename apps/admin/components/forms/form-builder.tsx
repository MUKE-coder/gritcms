"use client";

import { useForm, Controller } from "react-hook-form";
import type { FieldDefinition, FormDefinition } from "@/lib/resource";
import { TextField } from "./fields/text-field";
import { TextareaField } from "./fields/textarea-field";
import { NumberField } from "./fields/number-field";
import { SelectField } from "./fields/select-field";
import { DateField } from "./fields/date-field";
import { ToggleField } from "./fields/toggle-field";
import { CheckboxField } from "./fields/checkbox-field";
import { RadioField } from "./fields/radio-field";
import { ImageField } from "./fields/image-field";
import { ImagesField } from "./fields/images-field";
import { VideoField } from "./fields/video-field";
import { VideosField } from "./fields/videos-field";
import { FileField } from "./fields/file-field";
import { FilesField } from "./fields/files-field";
import { RichTextField } from "./fields/rich-text-field";
import { RelationshipSelectField } from "./fields/relationship-select-field";
import { MultiRelationshipSelectField } from "./fields/multi-relationship-select-field";
import { Loader2 } from "@/lib/icons";

interface FormBuilderProps {
  form: FormDefinition;
  defaultValues?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function FormBuilder({
  form: formDef,
  defaultValues = {},
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel = "Save",
}: FormBuilderProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: buildDefaults(formDef.fields, defaultValues),
  });

  const isTwoColumn = formDef.layout === "two-column";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div
        className={`grid gap-4 ${isTwoColumn ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}
      >
        {formDef.fields.map((field) => (
          <div
            key={field.key}
            className={field.colSpan === 2 && isTwoColumn ? "sm:col-span-2" : ""}
          >
            <FieldRenderer
              field={field}
              control={control}
              errors={errors}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

export function FieldRenderer({
  field,
  control,
  errors,
}: {
  field: FieldDefinition;
  control: ReturnType<typeof useForm>["control"];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: Record<string, any>;
}) {
  const error = errors[field.key]?.message as string | undefined;

  switch (field.type) {
    case "text":
      return (
        <Controller
          name={field.key}
          control={control}
          rules={field.required ? { required: `${field.label} is required` } : undefined}
          render={({ field: formField }) => (
            <TextField field={field} value={formField.value ?? ""} onChange={formField.onChange} error={error} />
          )}
        />
      );
    case "textarea":
      return (
        <Controller
          name={field.key}
          control={control}
          rules={field.required ? { required: `${field.label} is required` } : undefined}
          render={({ field: formField }) => (
            <TextareaField field={field} value={formField.value ?? ""} onChange={formField.onChange} error={error} />
          )}
        />
      );
    case "number":
      return (
        <Controller
          name={field.key}
          control={control}
          rules={field.required ? { required: `${field.label} is required` } : undefined}
          render={({ field: formField }) => (
            <NumberField field={field} value={formField.value ?? ""} onChange={formField.onChange} error={error} />
          )}
        />
      );
    case "select":
      return (
        <Controller
          name={field.key}
          control={control}
          rules={field.required ? { required: `${field.label} is required` } : undefined}
          render={({ field: formField }) => (
            <SelectField field={field} value={formField.value ?? ""} onChange={formField.onChange} error={error} />
          )}
        />
      );
    case "date":
    case "datetime":
      return (
        <Controller
          name={field.key}
          control={control}
          rules={field.required ? { required: `${field.label} is required` } : undefined}
          render={({ field: formField }) => (
            <DateField field={field} value={formField.value ?? ""} onChange={formField.onChange} error={error} />
          )}
        />
      );
    case "toggle":
      return (
        <Controller
          name={field.key}
          control={control}
          render={({ field: formField }) => (
            <ToggleField field={field} value={Boolean(formField.value)} onChange={formField.onChange} error={error} />
          )}
        />
      );
    case "checkbox":
      return (
        <Controller
          name={field.key}
          control={control}
          render={({ field: formField }) => (
            <CheckboxField field={field} value={Boolean(formField.value)} onChange={formField.onChange} error={error} />
          )}
        />
      );
    case "radio":
      return (
        <Controller
          name={field.key}
          control={control}
          rules={field.required ? { required: `${field.label} is required` } : undefined}
          render={({ field: formField }) => (
            <RadioField field={field} value={formField.value ?? ""} onChange={formField.onChange} error={error} />
          )}
        />
      );
    case "image":
      return (
        <Controller
          name={field.key}
          control={control}
          rules={field.required ? { required: `${field.label} is required` } : undefined}
          render={({ field: formField }) => (
            <ImageField field={field} value={formField.value ?? ""} onChange={formField.onChange} error={error} />
          )}
        />
      );
    case "images":
      return (
        <Controller
          name={field.key}
          control={control}
          rules={field.required ? { required: `${field.label} is required` } : undefined}
          render={({ field: formField }) => (
            <ImagesField field={field} value={formField.value ?? []} onChange={formField.onChange} error={error} />
          )}
        />
      );
    case "video":
      return (
        <Controller
          name={field.key}
          control={control}
          rules={field.required ? { required: `${field.label} is required` } : undefined}
          render={({ field: formField }) => (
            <VideoField field={field} value={formField.value ?? ""} onChange={formField.onChange} error={error} />
          )}
        />
      );
    case "videos":
      return (
        <Controller
          name={field.key}
          control={control}
          rules={field.required ? { required: `${field.label} is required` } : undefined}
          render={({ field: formField }) => (
            <VideosField field={field} value={formField.value ?? []} onChange={formField.onChange} error={error} />
          )}
        />
      );
    case "file":
      return (
        <Controller
          name={field.key}
          control={control}
          rules={field.required ? { required: `${field.label} is required` } : undefined}
          render={({ field: formField }) => (
            <FileField field={field} value={formField.value ?? ""} onChange={formField.onChange} error={error} />
          )}
        />
      );
    case "files":
      return (
        <Controller
          name={field.key}
          control={control}
          rules={field.required ? { required: `${field.label} is required` } : undefined}
          render={({ field: formField }) => (
            <FilesField field={field} value={formField.value ?? []} onChange={formField.onChange} error={error} />
          )}
        />
      );
    case "relationship-select":
      return (
        <Controller
          name={field.key}
          control={control}
          rules={field.required ? { required: `${field.label} is required` } : undefined}
          render={({ field: formField }) => (
            <RelationshipSelectField field={field} value={formField.value ?? ""} onChange={formField.onChange} error={error} />
          )}
        />
      );
    case "multi-relationship-select":
      return (
        <Controller
          name={field.key}
          control={control}
          render={({ field: formField }) => (
            <MultiRelationshipSelectField field={field} value={formField.value ?? []} onChange={formField.onChange} error={error} />
          )}
        />
      );
    case "richtext":
      return (
        <Controller
          name={field.key}
          control={control}
          rules={field.required ? { required: `${field.label} is required` } : undefined}
          render={({ field: formField }) => (
            <RichTextField field={field} value={formField.value ?? ""} onChange={formField.onChange} error={error} />
          )}
        />
      );
    default:
      return null;
  }
}

export function buildDefaults(
  fields: FieldDefinition[],
  existing: Record<string, unknown>
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const field of fields) {
    // multi-relationship-select: extract IDs from the nested array of objects
    if (field.type === "multi-relationship-select" && field.relationshipKey) {
      const related = existing[field.relationshipKey];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      defaults[field.key] = Array.isArray(related) ? related.map((r: any) => r.id) : [];
      continue;
    }
    if (field.key in existing) {
      defaults[field.key] = existing[field.key];
    } else if (field.defaultValue !== undefined) {
      defaults[field.key] = field.defaultValue;
    } else if (field.type === "toggle" || field.type === "checkbox") {
      defaults[field.key] = false;
    } else {
      defaults[field.key] = "";
    }
  }
  return defaults;
}
