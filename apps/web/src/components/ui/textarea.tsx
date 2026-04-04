import { cn } from "@/lib/utils";
import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({ label, error, hint, className, id, ...props }: TextareaProps) {
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
      <textarea
        id={inputId}
        className={cn(
          "min-h-[100px] w-full resize-y rounded-lg border px-3 py-2.5 text-sm",
          "bg-[var(--input-bg)] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)]",
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
        <p className="text-xs" style={{ color: "var(--status-error)" }}>
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
