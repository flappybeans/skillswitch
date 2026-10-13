import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";

interface FieldProps extends ComponentProps<"input"> {
  label: string;
  hint?: string;
}

export function Field({ label, hint, id, ...props }: FieldProps) {
  const inputId = id ?? props.name;

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="text-sm font-semibold">
        {label}
      </label>
      <Input id={inputId} {...props} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}