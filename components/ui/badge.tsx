import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Tone = "default" | "points" | "outline";

const toneStyles: Record<Tone, string> = {
  default: "border-transparent bg-primary text-primary-foreground",
  points: "border-transparent bg-accent text-accent-foreground",
  outline: "border-line bg-transparent text-foreground",
};

interface BadgeProps extends ComponentProps<"span"> {
  tone?: Tone;
}

export function Badge({ tone = "default", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        toneStyles[tone],
        className
      )}
      {...props}
    />
  );
}
