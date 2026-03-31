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

interface Brand {
  id: string;
  name: string;
  status: string;
  system_prompt: string | null;
  brand_guidelines: string | null;
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
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/brands"
          className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to brands
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{brand.name}</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
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
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-4 py-3">
          <Spinner size="sm" />
          <p className="text-sm text-[var(--text-primary)]">
            Analysing your reference images and building the brand visual DNA…
          </p>
        </div>
      )}

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
                  <p className={`text-sm ${saveMessage === "Saved!" ? "text-green-500" : "text-red-500"}`}>
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
            <p className="text-sm text-[var(--text-muted)] py-4 text-center">
              {isProcessing
                ? "Generating visual style guide…"
                : "Style guide not generated yet"}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
