import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variantStyles: Record<Variant, string> = {
  primary:
    "border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
  outline: "border-line bg-card text-foreground hover:bg-muted",
  ghost: "border-transparent text-foreground hover:bg-muted",
  danger:
    "border-transparent bg-danger text-danger-foreground hover:bg-danger/90",
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
    "inline-flex items-center justify-center gap-2 rounded-md border font-medium",
    "transition-colors",
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
