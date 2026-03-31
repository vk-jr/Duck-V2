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
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <Zap className="h-7 w-7 text-[var(--accent)]" />
            <span className="text-2xl font-bold">Duck</span>
          </Link>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Brand-consistent AI image generation
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-xl">
          {/* Tabs */}
          <div className="mb-6 flex rounded-lg bg-[var(--surface-2)] p-1">
            <button
              onClick={() => setTab("login")}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                tab === "login"
                  ? "bg-[var(--surface-1)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              Sign in
            </button>
            <button
              onClick={() => setTab("signup")}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                tab === "signup"
                  ? "bg-[var(--surface-1)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              Create account
            </button>
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
                <p className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-500">
                  {loginState.error}
                </p>
              )}
              <Button type="submit" loading={loginPending} className="w-full mt-2">
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
                <p className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-500">
                  {signupState.error}
                </p>
              )}
              <Button type="submit" loading={signupPending} className="w-full mt-2">
                Create account
              </Button>
              <p className="text-center text-xs text-[var(--text-muted)]">
                By signing up, you agree to our terms of service.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
