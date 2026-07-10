import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "ghost" | "link" | "secondary" | "gradient";
  size?: "default" | "sm" | "lg" | "icon";
  isLoading?: boolean;
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default:
    "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-[0_0_16px_rgba(108,99,255,0.3)] hover:shadow-[0_0_24px_rgba(108,99,255,0.5)] focus-visible:ring-[var(--accent)]",
  gradient:
    "bg-gradient-to-r from-[#6c63ff] to-[#ff6584] text-white hover:opacity-90 shadow-[0_0_20px_rgba(108,99,255,0.4)] hover:shadow-[0_0_32px_rgba(108,99,255,0.6)] focus-visible:ring-[var(--accent)]",
  destructive:
    "bg-[var(--danger)] text-white hover:opacity-90 shadow-[0_0_12px_rgba(255,101,132,0.3)] focus-visible:ring-[var(--danger)]",
  outline:
    "border border-[var(--border-bright)] bg-[var(--surface-2)] text-[var(--foreground)] hover:bg-[var(--surface-3)] hover:border-[var(--accent)] focus-visible:ring-[var(--accent)]",
  ghost:
    "bg-transparent text-[var(--foreground-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] focus-visible:ring-[var(--border-bright)]",
  link:
    "bg-transparent text-[var(--accent)] underline-offset-4 hover:underline p-0 h-auto focus-visible:ring-[var(--accent)]",
  secondary:
    "bg-[var(--surface-3)] text-[var(--foreground)] hover:bg-[var(--border)] focus-visible:ring-[var(--border-bright)]",
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  default: "h-10 px-5 py-2 text-sm",
  sm: "h-8 px-3 text-xs rounded-lg",
  lg: "h-12 px-7 text-base",
  icon: "h-10 w-10",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
          "disabled:pointer-events-none disabled:opacity-40",
          "active:scale-[0.97]",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
