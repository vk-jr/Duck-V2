"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const themes = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "brand", icon: Zap, label: "Brand" },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div
      className="flex items-center gap-0.5 rounded-lg p-1"
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
      }}
    >
      {themes.map(({ value, icon: Icon, label }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            onClick={() => setTheme(value)}
            title={label}
            className={cn(
              "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all duration-150",
              active
                ? "shadow-sm"
                : "hover:text-[var(--text-primary)]"
            )}
            style={
              active
                ? {
                    background: "var(--surface-1)",
                    color: "var(--accent)",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                  }
                : { color: "var(--text-subtle)" }
            }
          >
            <span className="flex items-center justify-center gap-1">
              <Icon className="h-3 w-3" />
              <span className="hidden sm:inline">{label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
