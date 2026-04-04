import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-secondary)" }}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "h-9 w-full rounded-lg border bg-[var(--input-bg)] px-3 text-sm",
          "text-[var(--text-primary)] placeholder:text-[var(--text-subtle)]",
          "border-[var(--input-border)]",
          "transition-all duration-150",
          "focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20",
          "disabled:cursor-not-allowed disabled:opacity-40",
          error && "border-[var(--status-error)] focus:border-[var(--status-error)] focus:ring-red-500/20",
          className
        )}
        {...props}
      />
      {error && (
        <p className="flex items-center gap-1 text-xs" style={{ color: "var(--status-error)" }}>
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs" style={{ color: "var(--text-subtle)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}
