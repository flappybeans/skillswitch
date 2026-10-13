import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variantStyles: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground shadow-brutal-sm hover:bg-primary/90",
  outline: "bg-card text-foreground shadow-brutal-sm hover:bg-muted",
  ghost: "border-transparent hover:bg-muted",
  danger: "bg-danger text-white shadow-brutal-sm",
};

const sizeStyles: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

interface ButtonStyleOptions {
  variant?: Variant;
  size?: Size;
  className?: string;
}

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: ButtonStyleOptions = {}): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-md border-[1.5px] border-line font-semibold",
    "transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    "disabled:pointer-events-none disabled:opacity-50",
    variantStyles[variant],
    sizeStyles[size],
    className
  );
}

interface ButtonProps extends ComponentProps<"button">, ButtonStyleOptions {}

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return (
    <button className={buttonClasses({ variant, size, className })} {...props} />
  );
}