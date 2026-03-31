import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Wand2, ShieldCheck, ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function QualityCheckerPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: recentChecks } = await supabase
    .from("quality_checks")
    .select("id, status, score, created_at, brand_id, brands(name)")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Quality Checker</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Extract brand guidelines and audit image compliance
        </p>
      </div>

      {/* Action cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/quality-checker/create"
          className="group flex items-start gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 transition-colors hover:border-[var(--accent)]/50"
        >
          <div className="rounded-xl bg-[var(--accent)]/10 p-3 text-[var(--accent)]">
            <Wand2 className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-[var(--text-primary)]">
              Create Brand Guidelines
            </p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Extract colours, typography, and style rules from a reference image
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100 mt-0.5" />
        </Link>

        <Link
          href="/dashboard/quality-checker/check"
          className="group flex items-start gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 transition-colors hover:border-[var(--accent)]/50"
        >
          <div className="rounded-xl bg-[var(--accent)]/10 p-3 text-[var(--accent)]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-[var(--text-primary)]">
              Check Image Compliance
            </p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Score any image against your brand guidelines (0–100)
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100 mt-0.5" />
        </Link>
      </div>

      {/* Recent checks */}
      {recentChecks && recentChecks.length > 0 && (
        <div>
          <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
            Recent Audits
          </h2>
          <Card>
            <CardContent className="pt-4">
              <ul className="flex flex-col divide-y divide-[var(--border)]">
                {recentChecks.map((check) => {
                  const brand = check.brands as unknown as { name: string } | null;
                  return (
                    <li key={check.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {brand?.name ?? "Unknown brand"}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {formatDate(check.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {check.score !== null && check.status === "completed" && (
                          <span className="text-sm font-bold text-[var(--text-primary)]">
                            {check.score}
                          </span>
                        )}
                        <StatusBadge status={check.status} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
