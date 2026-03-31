"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { startQualityCheck } from "./actions";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import type { QualityCheckResult } from "@/types";

export default function CheckCompliancePage() {
  const [brands, setBrands] = useState<{ id: string; name: string; brand_guidelines: string | null }[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qualityCheckId, setQualityCheckId] = useState<string | null>(null);
  const [checkStatus, setCheckStatus] = useState<"idle" | "pending" | "processing" | "completed" | "failed">("idle");
  const [result, setResult] = useState<QualityCheckResult | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    createClient()
      .from("brands")
      .select("id, name, brand_guidelines")
      .then(({ data }) =>
        setBrands((data ?? []).filter((b) => b.brand_guidelines))
      );
  }, []);

  // Realtime subscription
  useEffect(() => {
    if (!qualityCheckId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`qc-${qualityCheckId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "quality_checks",
          filter: `id=eq.${qualityCheckId}`,
        },
        (payload) => {
          const row = payload.new as { status: string; result: QualityCheckResult | null; score: number | null };
          setCheckStatus(row.status as typeof checkStatus);
          if (row.status === "completed") {
            setResult(row.result);
            setScore(row.score);
            supabase.removeChannel(channel);
          }
          if (row.status === "failed") {
            setError("Analysis failed. Please try again.");
            supabase.removeChannel(channel);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qualityCheckId]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setScore(null);

    const formData = new FormData(e.currentTarget);
    if (file) formData.set("image", file);

    startTransition(async () => {
      const res = await startQualityCheck(formData);
      if (!res.success) {
        setError(res.error ?? "Failed");
        setCheckStatus("idle");
      } else if (res.data) {
        setQualityCheckId(res.data.qualityCheckId);
        setCheckStatus("processing");
      }
    });
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <Link
          href="/dashboard/quality-checker"
          className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Check Image Compliance</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Score any image against your brand guidelines
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form */}
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {brands.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] text-center py-4">
                  No brands with guidelines. <Link href="/dashboard/quality-checker/create" className="text-[var(--accent)] hover:underline">Create guidelines first</Link>.
                </p>
              ) : (
                <>
                  <Select
                    label="Brand"
                    name="brandId"
                    options={brands.map((b) => ({ value: b.id, label: b.name }))}
                    placeholder="Select a brand"
                    required
                  />

                  <FileUpload
                    label="Image to audit"
                    multiple={false}
                    maxFiles={1}
                    onFilesChange={(files) => setFile(files[0] ?? null)}
                  />

                  {error && (
                    <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-500">
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    loading={isPending || checkStatus === "processing" || checkStatus === "pending"}
                    disabled={!file}
                    className="w-full"
                  >
                    {checkStatus === "processing" ? "Analysing…" : "Check compliance"}
                  </Button>
                </>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardContent className="pt-6">
            {(checkStatus === "processing" || checkStatus === "pending") && !result && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Spinner size="lg" />
                <p className="text-sm text-[var(--text-muted)]">Analysing image…</p>
              </div>
            )}

            {result && score !== null && (
              <ComplianceResult result={result} score={score} />
            )}

            {checkStatus === "idle" && !result && (
              <div className="flex flex-col items-center gap-3 py-8 text-center text-[var(--text-muted)]">
                <p className="text-sm">Results will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ComplianceResult({ result, score }: { result: QualityCheckResult; score: number }) {
  const gradeIcon =
    result.grade === "PASS" ? (
      <CheckCircle className="h-8 w-8 text-green-500" />
    ) : result.grade === "WARN" ? (
      <AlertTriangle className="h-8 w-8 text-yellow-500" />
    ) : (
      <XCircle className="h-8 w-8 text-red-500" />
    );

  const gradeVariant =
    result.grade === "PASS" ? "pass" : result.grade === "WARN" ? "warn" : "failed";

  const analyses = [
    { label: "Colour", item: result.color_analysis },
    { label: "Typography", item: result.typography_analysis },
    { label: "Logo", item: result.logo_analysis },
    { label: "Aesthetic", item: result.aesthetic_analysis },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Score */}
      <div className="flex items-center gap-4">
        {gradeIcon}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-4xl font-bold text-[var(--text-primary)]">{score}</span>
            <span className="text-lg text-[var(--text-muted)]">/100</span>
          </div>
          <Badge variant={gradeVariant as "pass" | "warn" | "failed"}>{result.grade}</Badge>
        </div>
      </div>

      {/* Analysis items */}
      <div className="flex flex-col gap-3">
        {analyses.map(({ label, item }) => (
          <div key={label} className="rounded-lg border border-[var(--border)] p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-[var(--text-primary)]">{label}</span>
              <span className={`text-xs font-medium ${item.result === "Match" ? "text-green-500" : item.result === "Mismatch" ? "text-red-500" : "text-[var(--text-muted)]"}`}>
                {item.result}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">{item.detail}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      {result.improvement_actions.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold text-[var(--text-primary)]">Improvement Actions</p>
          <ul className="flex flex-col gap-1.5">
            {result.improvement_actions.map((action, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-muted)]">
                <span className="mt-0.5 flex-shrink-0 text-[var(--accent)]">•</span>
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
