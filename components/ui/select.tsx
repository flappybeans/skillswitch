import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-md border bg-card px-3 text-sm",
        "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/25",
        className
      )}
      {...props}
    />
  );
}
