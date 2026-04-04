"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { deleteBrand, updateBrandSystemPrompt, retryBrandAnalysis } from "@/app/dashboard/brands/actions";
import { formatDate } from "@/lib/utils";
import type { BrandGuidelines } from "@/types";

interface Brand {
  id: string;
  name: string;
  status: string;
  system_prompt: string | null;
  brand_guidelines: BrandGuidelines | null;
  created_at: string;
  brand_images: { id: string; image_url: string; numbering: number }[];
  reference_images: { id: string; image_url: string; content_description: string; style_description: string }[];
}

export function BrandDetailClient({ brand: initial }: { brand: Brand }) {
  const [brand, setBrand] = useState(initial);
  const [prompt, setPrompt] = useState(initial.system_prompt ?? "");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`brand-${brand.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "brands",
          filter: `id=eq.${brand.id}`,
        },
        (payload) => {
          setBrand((prev) => ({ ...prev, ...payload.new }));
          if (payload.new.system_prompt) {
            setPrompt(payload.new.system_prompt);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [brand.id]);

  function handleSavePrompt() {
    setSaveMessage(null);
    startTransition(async () => {
      const result = await updateBrandSystemPrompt(brand.id, prompt);
      setSaveMessage(result.success ? "Saved!" : (result.error ?? "Failed to save"));
    });
  }

  function handleRetry() {
    startTransition(async () => {
      await retryBrandAnalysis(brand.id);
    });
  }

  function handleDelete() {
    if (!confirm("Delete this brand? This cannot be undone.")) return;
    startTransition(async () => {
      await deleteBrand(brand.id);
    });
  }

  const isProcessing = brand.status === "pending";
  const thumbnails = [...(brand.brand_images ?? [])].sort(
    (a, b) => a.numbering - b.numbering
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 max-w-4xl">
        <Link
          href="/dashboard/brands"
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to brands
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {brand.name}
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              Created {formatDate(brand.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={brand.status} />
            {brand.status === "failed" && (
              <Button variant="secondary" size="sm" onClick={handleRetry} loading={isPending}>
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </Button>
            )}
            <Button variant="destructive" size="sm" onClick={handleDelete} loading={isPending}>
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Processing state */}
      {isProcessing && (
        <div
          className="mb-6 max-w-4xl flex items-center gap-3 rounded-xl px-4 py-3"
          style={{
            border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
            background: "color-mix(in srgb, var(--accent) 5%, var(--surface-1))",
          }}
        >
          <Spinner size="sm" />
          <p className="text-sm" style={{ color: "var(--text-primary)" }}>
            Analysing your reference images and building the brand visual DNA…
          </p>
        </div>
      )}

      {/* Two-column layout: left = content, right = brand guide */}
      <div className="flex gap-8 items-start">
        {/* Left column */}
        <div className="flex-1 min-w-0 max-w-2xl">
          {/* Reference images */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Reference Images ({thumbnails.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
                {thumbnails.map((img) => (
                  <div
                    key={img.id}
                    className="relative aspect-square overflow-hidden rounded-lg bg-[var(--surface-2)]"
                  >
                    <Image src={img.image_url} alt="" fill className="object-cover" unoptimized />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* System prompt */}
          <Card>
            <CardHeader>
              <CardTitle>Visual Style Guide</CardTitle>
            </CardHeader>
            <CardContent>
              {brand.status === "ready" || brand.system_prompt ? (
                <div className="flex flex-col gap-4">
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={12}
                    placeholder="AI-generated visual style guide will appear here…"
                    hint="This guide is sent to the image AI for every generation. Edit it to fine-tune your brand's style."
                  />
                  <div className="flex items-center justify-between">
                    {saveMessage && (
                      <p
                        className="text-sm"
                        style={{
                          color: saveMessage === "Saved!"
                            ? "var(--status-success)"
                            : "var(--status-error)",
                        }}
                      >
                        {saveMessage}
                      </p>
                    )}
                    <Button
                      onClick={handleSavePrompt}
                      loading={isPending}
                      disabled={!prompt.trim()}
                      className="ml-auto"
                    >
                      <Save className="h-4 w-4" /> Save changes
                    </Button>
                  </div>
                </div>
              ) : (
                <p
                  className="py-6 text-center text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  {isProcessing
                    ? "Generating visual style guide…"
                    : "Style guide not generated yet"}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column — brand guide */}
        <div className="w-[420px] flex-shrink-0">
          {brand.brand_guidelines ? (
            <BrandGuideCard
              brandName={brand.name}
              guidelines={brand.brand_guidelines}
              referenceImages={brand.brand_images ?? []}
            />
          ) : (
            <div
              className="rounded-xl border-2 border-dashed p-8 text-center"
              style={{ borderColor: "var(--border)" }}
            >
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {isProcessing ? "Extracting brand guide…" : "Brand guide not yet generated"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Brand Guide Card ──────────────────────────────────────────

function BrandGuideCard({
  brandName,
  guidelines,
  referenceImages,
}: {
  brandName: string;
  guidelines: BrandGuidelines;
  referenceImages: { id: string; image_url: string; numbering: number }[];
}) {
  // Load Google Fonts for each detected font family
  useEffect(() => {
    for (const font of guidelines.fonts ?? []) {
      const linkId = `gf-brand-${font.name.replace(/\s+/g, "-")}`;
      if (!document.getElementById(linkId)) {
        const link = document.createElement("link");
        link.id = linkId;
        link.rel = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.name)}:wght@400;600;700;900&display=swap`;
        document.head.appendChild(link);
      }
    }
  }, [guidelines.fonts]);

  const thumbnails = [...referenceImages].sort((a, b) => a.numbering - b.numbering);

  return (
    <Card className="mb-6 overflow-hidden">
      {/* Header */}
      <div
        className="px-6 py-5"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <p
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--accent)" }}
        >
          Brand Guide
        </p>
        <h2
          className="mt-1 text-xl font-bold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {brandName}
        </h2>
      </div>

      <CardContent className="p-0" style={{ borderTop: "none" }}>
        {/* LOGOS */}
        <section className="px-6 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <p
            className="mb-3 text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--text-subtle)" }}
          >
            Logos
          </p>
          <div className="flex flex-wrap gap-3">
            {thumbnails.slice(0, 6).map((img) => (
              <div
                key={img.id}
                className="relative h-20 w-20 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)]"
              >
                <Image src={img.image_url} alt="" fill className="object-cover" unoptimized />
              </div>
            ))}
          </div>
          {guidelines.has_logo && guidelines.logo_description && (
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              {guidelines.logo_description}
            </p>
          )}
        </section>

        {/* COLORS */}
        <section className="px-6 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <p
            className="mb-4 text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--text-subtle)" }}
          >
            Colors
          </p>

          {guidelines.primary_colors?.length > 0 && (
            <div className="mb-5">
              <p className="mb-3 text-xs font-semibold text-[var(--text-primary)]">
                PRIMARY COLORS
              </p>
              <div className="flex flex-wrap gap-4">
                {guidelines.primary_colors.map((color) => (
                  <ColorSwatch key={color.hex} color={color} />
                ))}
              </div>
            </div>
          )}

          {guidelines.secondary_colors?.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-semibold text-[var(--text-primary)]">
                SECONDARY COLORS
              </p>
              <div className="flex flex-wrap gap-4">
                {guidelines.secondary_colors.map((color) => (
                  <ColorSwatch key={color.hex} color={color} />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* TYPOGRAPHY */}
        {guidelines.fonts?.length > 0 && (
          <section className="px-6 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
            <p
              className="mb-4 text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "var(--text-subtle)" }}
            >
              Typography
            </p>
            <div className="flex flex-col gap-6">
              {guidelines.fonts.map((font) => (
                <div key={font.name}>
                  <div className="mb-1 flex items-baseline gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                      {font.name}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] capitalize">
                      ({font.role})
                    </span>
                  </div>
                  {/* Large specimen in the actual font */}
                  <p
                    className="mb-1 text-4xl text-[var(--text-primary)]"
                    style={{ fontFamily: `"${font.name}", serif` }}
                  >
                    Aa
                  </p>
                  {/* Weight list in the font */}
                  <p
                    className="text-sm text-[var(--text-muted)]"
                    style={{ fontFamily: `"${font.name}", sans-serif` }}
                  >
                    {font.weights.join("  ·  ")}
                  </p>
                  {font.usage && (
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{font.usage}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* BRAND PERSONALITY */}
        {guidelines.brand_personality?.length > 0 && (
          <section className="px-6 py-5">
            <p
              className="mb-3 text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "var(--text-subtle)" }}
            >
              Brand Personality
            </p>
            <div className="flex flex-wrap gap-2">
              {guidelines.brand_personality.map((trait) => (
                <span
                  key={trait}
                  className="rounded-full px-3 py-1 text-xs font-medium"
                  style={{
                    border: "1px solid var(--border-strong)",
                    background: "var(--surface-2)",
                    color: "var(--text-primary)",
                  }}
                >
                  {trait}
                </span>
              ))}
            </div>
          </section>
        )}
      </CardContent>
    </Card>
  );
}

function ColorSwatch({ color }: { color: import("@/types").BrandColor }) {
  const isLight =
    color.hex.toLowerCase() === "#ffffff" ||
    color.hex.toLowerCase() === "#f4f4f4" ||
    color.hex.toLowerCase() === "#fafafa";

  return (
    <div className="flex flex-col items-start gap-2">
      <div
        className="h-14 w-14 rounded-xl transition-transform duration-150 hover:scale-105"
        style={{
          backgroundColor: color.hex,
          border: isLight ? "1px solid var(--border)" : undefined,
          boxShadow: isLight ? undefined : `0 2px 8px ${color.hex}40`,
        }}
      />
      <div>
        <p
          className="text-xs font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {color.name}
        </p>
        <p
          className="font-mono text-[10px] uppercase"
          style={{ color: "var(--text-subtle)" }}
        >
          {color.hex}
        </p>
      </div>
    </div>
  );
}
