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
    <div className="p-8 max-w-[900px]">
      <div className="mb-8">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Quality Checker
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          Extract brand guidelines and audit image compliance
        </p>
      </div>

      {/* Action cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <ActionCard
          href="/dashboard/quality-checker/create"
          icon={<Wand2 className="h-5 w-5" />}
          title="Create Brand Guidelines"
          description="Extract colours, typography, and style rules from a reference image"
        />
        <ActionCard
          href="/dashboard/quality-checker/check"
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Check Image Compliance"
          description="Score any image against your brand guidelines (0–100)"
        />
      </div>

      {/* Recent checks */}
      {recentChecks && recentChecks.length > 0 && (
        <div>
          <h2
            className="mb-4 text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--text-secondary)" }}
          >
            Recent Audits
          </h2>
          <Card>
            <CardContent className="p-0">
              <ul className="flex flex-col">
                {recentChecks.map((check, i) => {
                  const brand = check.brands as unknown as { name: string } | null;
                  return (
                    <li
                      key={check.id}
                      className="flex items-center justify-between px-5 py-3.5"
                      style={{
                        borderTop: i > 0 ? "1px solid var(--border)" : undefined,
                      }}
                    >
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {brand?.name ?? "Unknown brand"}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-subtle)" }}>
                          {formatDate(check.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {check.score !== null && check.status === "completed" && (
                          <span
                            className="text-sm font-bold tabular-nums"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {check.score}
                            <span
                              className="ml-0.5 text-xs font-normal"
                              style={{ color: "var(--text-subtle)" }}
                            >
                              /100
                            </span>
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

function ActionCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group card-hover-accent flex items-start gap-4 rounded-2xl p-5 active:scale-[0.99]"
      style={{
        border: "1px solid var(--border)",
        background: "var(--surface-1)",
        boxShadow: "var(--card-shadow)",
      }}
    >
      <div
        className="mt-0.5 rounded-xl p-2.5 icon-hover"
        style={{
          background: "var(--accent-subtle)",
          border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
          color: "var(--accent)",
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
          {title}
        </p>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {description}
        </p>
      </div>
      <ArrowRight
        className="mt-0.5 h-4 w-4 flex-shrink-0 opacity-0 transition-all duration-150 group-hover:translate-x-0.5 group-hover:opacity-100"
        style={{ color: "var(--accent)" }}
      />
    </Link>
  );
}
