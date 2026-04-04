import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
}

export function Card({ children, className, hover = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-[var(--card-bg)]",
        "border-[var(--card-border)]",
        hover &&
          "transition-all duration-200 hover:border-[var(--border-strong)] hover:shadow-[var(--card-shadow-hover)]",
        className
      )}
      style={{ boxShadow: "var(--card-shadow)" }}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...props }: Omit<CardProps, "hover">) {
  return (
    <div
      className={cn("flex flex-col gap-1.5 p-6 pb-0", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className, ...props }: Omit<CardProps, "hover">) {
  return (
    <h3
      className={cn(
        "text-base font-semibold leading-none tracking-tight text-[var(--text-primary)]",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ children, className, ...props }: Omit<CardProps, "hover">) {
  return (
    <p
      className={cn("text-sm leading-relaxed text-[var(--text-muted)]", className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({ children, className, ...props }: Omit<CardProps, "hover">) {
  return (
    <div className={cn("p-6", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className, ...props }: Omit<CardProps, "hover">) {
  return (
    <div
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    >
      {children}
    </div>
  );
}
