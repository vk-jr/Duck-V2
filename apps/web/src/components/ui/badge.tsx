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
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  pending:    "bg-amber-500/10  text-amber-500  border-amber-500/20",
  ready:      "bg-green-500/10  text-green-500  border-green-500/20",
  failed:     "bg-red-500/10    text-red-500    border-red-500/20",
  generating: "bg-blue-500/10   text-blue-400   border-blue-500/20",
  completed:  "bg-green-500/10  text-green-500  border-green-500/20",
  processing: "bg-blue-500/10   text-blue-400   border-blue-500/20",
  queued:     "bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20",
  retrying:   "bg-orange-500/10 text-orange-400 border-orange-500/20",
  warn:       "bg-amber-500/10  text-amber-500  border-amber-500/20",
  pass:       "bg-green-500/10  text-green-500  border-green-500/20",
  default:    "bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--border)]",
};

/* Variants that should show an animated dot */
const animatedVariants = new Set(["generating", "processing", "pending", "queued", "retrying"]);

export function Badge({
  variant = "default",
  dot,
  className,
  children,
  ...props
}: BadgeProps) {
  const showDot = dot ?? animatedVariants.has(variant);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {showDot && (
        <span
          className="h-1.5 w-1.5 rounded-full flex-shrink-0"
          style={{
            background: "currentColor",
            animation: animatedVariants.has(variant)
              ? "dot-pulse 1.5s ease-in-out infinite"
              : undefined,
          }}
        />
      )}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, BadgeVariant> = {
    pending:    "pending",
    ready:      "ready",
    failed:     "failed",
    generating: "generating",
    completed:  "completed",
    processing: "processing",
    queued:     "queued",
    retrying:   "retrying",
    PASS:       "pass",
    WARN:       "warn",
    FAIL:       "failed",
  };

  const variant = variantMap[status] ?? "default";
  return <Badge variant={variant}>{status}</Badge>;
}
