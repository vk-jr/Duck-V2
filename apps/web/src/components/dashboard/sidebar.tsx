"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wand2,
  Images,
  ShieldCheck,
  Layers,
  Settings,
  LogOut,
  Zap,
  Layout,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { logout } from "@/app/login/actions";
import type { Profile } from "@/types";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/generator", label: "Generator", icon: Wand2 },
  { href: "/dashboard/gallery", label: "Gallery", icon: Images },
  { href: "/dashboard/poster-studio", label: "Poster Studio", icon: Layout },
  { href: "/dashboard/quality-checker", label: "Quality Checker", icon: ShieldCheck },
  { href: "/dashboard/brands", label: "Brands", icon: Layers },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-[260px] flex-shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface-1)]">
      {/* Logo */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-4">
        <Zap className="h-6 w-6 text-[var(--accent)]" />
        <span className="text-lg font-bold">Duck</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="flex flex-col gap-0.5 px-3">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-[var(--border)] p-4 flex flex-col gap-3">
        <ThemeToggle />

        {/* User */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-[var(--accent-foreground)]">
            {profile?.full_name?.charAt(0).toUpperCase() ??
              profile?.email?.charAt(0).toUpperCase() ??
              "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-[var(--text-primary)]">
              {profile?.full_name ?? "User"}
            </p>
            <p className="truncate text-xs text-[var(--text-muted)]">{profile?.email}</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              title="Sign out"
              className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
