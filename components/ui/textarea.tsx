import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-md border bg-card px-3 py-2 text-sm",
        "placeholder:text-muted-foreground",
        "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/25",
        "disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
