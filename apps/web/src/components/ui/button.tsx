"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:pointer-events-none disabled:opacity-50",
        {
          // Variants
          "bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90 shadow-sm":
            variant === "primary",
          "bg-[var(--surface-2)] text-[var(--text-primary)] hover:bg-[var(--surface-3)] border border-[var(--border)]":
            variant === "secondary",
          "text-[var(--text-primary)] hover:bg-[var(--surface-2)]":
            variant === "ghost",
          "bg-red-600 text-white hover:bg-red-700 shadow-sm":
            variant === "destructive",
          "border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-2)]":
            variant === "outline",
          // Sizes
          "h-8 px-3 text-sm": size === "sm",
          "h-10 px-4 text-sm": size === "md",
          "h-12 px-6 text-base": size === "lg",
        },
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
