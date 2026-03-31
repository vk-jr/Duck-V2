import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type BadgeVariant =
  | "pending"
  | "ready"
  | "failed"
  | "generating"
  | "completed"
  | "processing"
  | "queued"
  | "retrying"
  | "warn"
  | "pass"
  | "default";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  ready: "bg-green-500/10 text-green-500 border-green-500/20",
  failed: "bg-red-500/10 text-red-500 border-red-500/20",
  generating: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  completed: "bg-green-500/10 text-green-500 border-green-500/20",
  processing: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  queued: "bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20",
  retrying: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  warn: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  pass: "bg-green-500/10 text-green-500 border-green-500/20",
  default: "bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--border)]",
};

export function Badge({ variant = "default", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, BadgeVariant> = {
    pending: "pending",
    ready: "ready",
    failed: "failed",
    generating: "generating",
    completed: "completed",
    processing: "processing",
    queued: "queued",
    retrying: "retrying",
    PASS: "pass",
    WARN: "warn",
    FAIL: "failed",
  };

  const variant = variantMap[status] ?? "default";

  return <Badge variant={variant}>{status}</Badge>;
}
