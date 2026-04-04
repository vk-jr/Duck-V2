"use client";

import { useActionState, useState } from "react";
import { login, signup } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/types";
import Link from "next/link";
import { Zap } from "lucide-react";

const initialState: ActionResult = { success: false };

export default function LoginPage() {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [loginState, loginAction, loginPending] = useActionState(login, initialState);
  const [signupState, signupAction, signupPending] = useActionState(signup, initialState);

  return (
    <div
      className="relative flex min-h-screen items-center justify-center px-4"
      style={{ background: "var(--bg)" }}
    >
      {/* Background glow */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[400px] opacity-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% -5%, var(--accent), transparent)",
        }}
      />
      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(var(--accent) 1px, transparent 1px), linear-gradient(90deg, var(--accent) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{
                background: "var(--accent)",
                boxShadow: "0 4px 16px var(--accent-glow)",
              }}
            >
              <Zap className="h-4.5 w-4.5" style={{ color: "var(--accent-foreground)" }} />
            </div>
            <span className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Duck
            </span>
          </Link>
          <p className="mt-2.5 text-sm" style={{ color: "var(--text-muted)" }}>
            Brand-consistent AI image generation
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--card-border)",
            boxShadow: "var(--card-shadow), 0 8px 32px rgba(0,0,0,0.08)",
          }}
        >
          {/* Tabs */}
          <div
            className="mb-6 flex rounded-lg p-1"
            style={{ background: "var(--surface-2)" }}
          >
            {(["login", "signup"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 rounded-md py-2 text-sm font-medium transition-all duration-150"
                style={
                  tab === t
                    ? {
                        background: "var(--surface-1)",
                        color: "var(--text-primary)",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      }
                    : { color: "var(--text-muted)" }
                }
              >
                {t === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {tab === "login" ? (
            <form action={loginAction} className="flex flex-col gap-4">
              <Input
                label="Email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
              <Input
                label="Password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              {loginState?.error && (
                <div
                  className="rounded-lg px-3 py-2.5 text-sm"
                  style={{
                    background: "color-mix(in srgb, var(--status-error) 8%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--status-error) 25%, transparent)",
                    color: "var(--status-error)",
                  }}
                >
                  {loginState.error}
                </div>
              )}
              <Button type="submit" loading={loginPending} className="mt-1 w-full">
                Sign in
              </Button>
            </form>
          ) : (
            <form action={signupAction} className="flex flex-col gap-4">
              <Input
                label="Email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
              <Input
                label="Password"
                name="password"
                type="password"
                placeholder="Min. 8 characters"
                required
                autoComplete="new-password"
              />
              {signupState?.error && (
                <div
                  className="rounded-lg px-3 py-2.5 text-sm"
                  style={{
                    background: "color-mix(in srgb, var(--status-error) 8%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--status-error) 25%, transparent)",
                    color: "var(--status-error)",
                  }}
                >
                  {signupState.error}
                </div>
              )}
              <Button type="submit" loading={signupPending} className="mt-1 w-full">
                Create account
              </Button>
              <p className="text-center text-xs" style={{ color: "var(--text-subtle)" }}>
                By signing up, you agree to our terms of service.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
