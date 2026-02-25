import type { FieldDefinition } from "@/lib/resource";

interface NumberFieldProps {
  field: FieldDefinition;
  value: string | number;
  onChange: (value: number | string) => void;
  error?: string;
}

export function NumberField({ field, value, onChange, error }: NumberFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">
        {field.label}
        {field.required && <span className="text-danger ml-1">*</span>}
      </label>

      <div className="flex">
        {field.prefix && (
          <span className="inline-flex items-center rounded-l-lg border border-r-0 border-border bg-bg-tertiary px-3 text-sm text-text-muted">
            {field.prefix}
          </span>
        )}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          placeholder={field.placeholder}
          min={field.min}
          max={field.max}
          step={field.step}
          className={`w-full ${field.prefix ? "rounded-r-lg" : field.suffix ? "rounded-l-lg" : "rounded-lg"} border border-border bg-bg-tertiary px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent ${error ? "border-danger" : ""}`}
        />
        {field.suffix && (
          <span className="inline-flex items-center rounded-r-lg border border-l-0 border-border bg-bg-tertiary px-3 text-sm text-text-muted">
            {field.suffix}
          </span>
        )}
      </div>

      {field.description && !error && (
        <p className="text-xs text-text-muted">{field.description}</p>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
