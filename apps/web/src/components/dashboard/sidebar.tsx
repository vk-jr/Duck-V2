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

const navGroups = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/dashboard/generator", label: "Generator", icon: Wand2 },
      { href: "/dashboard/gallery", label: "Gallery", icon: Images },
      { href: "/dashboard/poster-studio", label: "Poster Studio", icon: Layout },
    ],
  },
  {
    label: "Brand",
    items: [
      { href: "/dashboard/brands", label: "Brands", icon: Layers },
      { href: "/dashboard/quality-checker", label: "Quality Checker", icon: ShieldCheck },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();

  const initials =
    profile?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ??
    profile?.email?.charAt(0).toUpperCase() ??
    "?";

  return (
    <aside
      className="flex h-screen w-[248px] flex-shrink-0 flex-col"
      style={{
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-5 py-5"
        style={{ borderBottom: "1px solid var(--sidebar-border)" }}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{
            background: "var(--accent)",
            boxShadow: "0 2px 8px var(--accent-glow)",
          }}
        >
          <Zap className="h-4 w-4" style={{ color: "var(--accent-foreground)" }} />
        </div>
        <span
          className="text-[15px] font-bold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Duck
        </span>
        <span
          className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
          style={{
            background: "var(--accent-subtle)",
            color: "var(--accent)",
            border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
          }}
        >
          Beta
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <div className="flex flex-col gap-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p
                className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: "var(--text-subtle)" }}
              >
                {group.label}
              </p>
              <ul className="flex flex-col gap-0.5">
                {group.items.map(({ href, label, icon: Icon, exact }) => {
                  const active = exact
                    ? pathname === href
                    : pathname.startsWith(href);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                          active
                            ? "text-[var(--sidebar-active-text)]"
                            : "hover:bg-[var(--surface-2)]"
                        )}
                        style={
                          active
                            ? {
                                background: "var(--sidebar-active-bg)",
                                color: "var(--sidebar-active-text)",
                              }
                            : { color: "var(--text-muted)" }
                        }
                      >
                        {active && (
                          <span
                            className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full"
                            style={{ background: "var(--accent)" }}
                          />
                        )}
                        <Icon
                          className="h-4 w-4 flex-shrink-0 transition-transform duration-150 group-hover:scale-110"
                          style={
                            active
                              ? { color: "var(--accent)" }
                              : { color: "var(--text-subtle)" }
                          }
                        />
                        <span className={active ? "font-semibold" : ""}>{label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div
        className="px-3 pb-4 pt-3"
        style={{ borderTop: "1px solid var(--sidebar-border)" }}
      >
        <div className="mb-3 px-1">
          <ThemeToggle />
        </div>

        {/* User card */}
        <div
          className="flex items-center gap-2.5 rounded-xl p-2.5 transition-colors hover:bg-[var(--surface-2)]"
        >
          {/* Avatar */}
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
            style={{
              background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 60%, var(--accent-hover)))",
              color: "var(--accent-foreground)",
              boxShadow: "0 0 0 2px var(--sidebar-bg), 0 0 0 3px var(--accent)",
            }}
          >
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <p
              className="truncate text-xs font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {profile?.full_name ?? "User"}
            </p>
            <p
              className="truncate text-[11px]"
              style={{ color: "var(--text-subtle)" }}
            >
              {profile?.email}
            </p>
          </div>

          <form action={logout}>
            <button
              type="submit"
              title="Sign out"
              className="rounded-lg p-1.5 transition-colors hover:bg-[var(--surface-3)]"
              style={{ color: "var(--text-subtle)" }}
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
