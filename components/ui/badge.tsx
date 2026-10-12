import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Tone = "default" | "points" | "outline";

const toneStyles: Record<Tone, string> = {
  default: "bg-primary text-primary-foreground",
  points: "bg-accent text-accent-foreground",
  outline: "bg-transparent text-foreground",
};

interface BadgeProps extends ComponentProps<"span"> {
  tone?: Tone;
}

export function Badge({ tone = "default", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border-[1.5px] border-line px-2.5 py-0.5 text-xs font-semibold",
        toneStyles[tone],
        className
      )}
      {...props}
    />
  );
}