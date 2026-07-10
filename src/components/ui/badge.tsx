import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "success" | "destructive" | "warning" | "outline";
}

const variantClasses: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default:
    "bg-[var(--accent-dim)] text-[var(--accent)] border border-[rgba(108,99,255,0.3)]",
  secondary:
    "bg-[var(--surface-3)] text-[var(--foreground-muted)] border border-[var(--border)]",
  success:
    "bg-[rgba(67,233,123,0.12)] text-[var(--success)] border border-[rgba(67,233,123,0.3)]",
  destructive:
    "bg-[rgba(255,101,132,0.12)] text-[var(--danger)] border border-[rgba(255,101,132,0.3)]",
  warning:
    "bg-[rgba(247,151,30,0.12)] text-[var(--warning)] border border-[rgba(247,151,30,0.3)]",
  outline:
    "border border-[var(--border-bright)] text-[var(--foreground-muted)] bg-transparent",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
