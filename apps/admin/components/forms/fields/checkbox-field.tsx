import type { FieldDefinition } from "@/lib/resource";

interface CheckboxFieldProps {
  field: FieldDefinition;
  value: boolean;
  onChange: (value: boolean) => void;
  error?: string;
}

export function CheckboxField({ field, value, onChange, error }: CheckboxFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-border bg-bg-tertiary accent-accent"
        />
        <span className="text-sm font-medium text-foreground">{field.label}</span>
      </label>
      {field.description && !error && (
        <p className="text-xs text-text-muted ml-7">{field.description}</p>
      )}
      {error && <p className="text-xs text-danger ml-7">{error}</p>}
    </div>
  );
}
