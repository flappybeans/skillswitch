import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-md border-[1.5px] border-line bg-card px-3 text-sm",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        className
      )}
      {...props}
    />
  );
}