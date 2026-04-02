"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { startPosterGeneration, deletePoster } from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, truncate } from "@/lib/utils";
import { Layout, Trash2, LayoutIcon } from "lucide-react";
import type { PosterLayout, PosterFormat, POSTER_FORMAT_LABELS } from "@/types";
import type { PosterRow } from "./page";

// Fabric.js canvas requires window — must be dynamically imported with ssr: false
const PosterCanvas = dynamic(
  () => import("./canvas-editor").then((m) => m.PosterCanvas),
  { ssr: false, loading: () => <Spinner size="lg" /> }
);

interface Brand {
  id: string;
  name: string;
  status: string;
}

const FORMAT_OPTIONS = [
  { value: "square", label: "Square (1080×1080) — Instagram, LinkedIn" },
  { value: "portrait_a4", label: "Portrait A4 (794×1123) — Hiring posters, flyers" },
  { value: "landscape_16_9", label: "Landscape 16:9 (1920×1080) — Presentations, banners" },
  { value: "story_9_16", label: "Story 9:16 (1080×1920) — Instagram / WhatsApp Stories" },
];

const STAGE_LABELS: Record<string, string> = {
  intent: "Understanding your request…",
  layout: "Designing layout…",
  background: "Generating background…",
  storage: "Finishing up…",
};

type GenStatus = "idle" | "pending" | "generating" | "completed" | "failed";

export function PosterStudioClient({
  brands,
  initialPosters,
}: {
  brands: Brand[];
  initialPosters: PosterRow[];
}) {
  const [posterId, setPosterId] = useState<string | null>(null);
  const [genStatus, setGenStatus] = useState<GenStatus>("idle");
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [completedLayout, setCompletedLayout] = useState<PosterLayout | null>(null);
  const [completedBackgroundUrl, setCompletedBackgroundUrl] = useState<string | null>(null);
  const [completedPosterId, setCompletedPosterId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [posters, setPosters] = useState<PosterRow[]>(initialPosters);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Subscribe to realtime updates for the active poster
  useEffect(() => {
    if (!posterId) return;

    const supabase = createClient();
    let intervalId: ReturnType<typeof setInterval>;

    const channel = supabase
      .channel(`poster-${posterId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "posters",
          filter: `id=eq.${posterId}`,
        },
        (payload) => {
          const row = payload.new as {
            status: string;
            layout_json: PosterLayout | null;
            background_url: string | null;
            error_message: string | null;
          };

          if (row.status === "completed" && row.layout_json && row.background_url) {
            setGenStatus("completed");
            setCompletedLayout(row.layout_json);
            setCompletedBackgroundUrl(row.background_url);
            setCompletedPosterId(posterId);
            clearInterval(intervalId);
            supabase.removeChannel(channel);
          } else if (row.status === "failed") {
            setGenStatus("failed");
            setError(row.error_message ?? "Poster generation failed");
            clearInterval(intervalId);
            supabase.removeChannel(channel);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "poster_jobs",
          filter: `poster_id=eq.${posterId}`,
        },
        (payload) => {
          const row = payload.new as { current_stage: string | null };
          if (row.current_stage) {
            setCurrentStage(row.current_stage);
          }
        }
      )
      .subscribe();

    // Polling fallback every 4 seconds
    intervalId = setInterval(async () => {
      const { data } = await supabase
        .from("posters")
        .select("status, layout_json, background_url, error_message")
        .eq("id", posterId)
        .single();

      if (data) {
        if (data.status === "completed" && data.layout_json && data.background_url) {
          setGenStatus("completed");
          setCompletedLayout(data.layout_json as PosterLayout);
          setCompletedBackgroundUrl(data.background_url);
          setCompletedPosterId(posterId);
          clearInterval(intervalId);
          supabase.removeChannel(channel);
        } else if (data.status === "failed") {
          setGenStatus("failed");
          setError(data.error_message ?? "Poster generation failed");
          clearInterval(intervalId);
          supabase.removeChannel(channel);
        }
      }

      // Also poll current_stage from poster_jobs
      const { data: jobData } = await supabase
        .from("poster_jobs")
        .select("current_stage")
        .eq("poster_id", posterId)
        .single();

      if (jobData?.current_stage) {
        setCurrentStage(jobData.current_stage);
      }
    }, 4000);

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [posterId]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCompletedLayout(null);
    setCompletedBackgroundUrl(null);
    setCompletedPosterId(null);
    setCurrentStage(null);
    setPosterId(null);
    setGenStatus("pending");

    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await startPosterGeneration(formData);
      if (!result.success) {
        setError(result.error ?? "Failed to start generation");
        setGenStatus("idle");
      } else if (result.data) {
        setPosterId(result.data.posterId);
        setGenStatus("generating");
      }
    });
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await deletePoster(id);
    setPosters((prev) => prev.filter((p) => p.id !== id));
    setDeletingId(null);
  }

  const isGenerating = isPending || genStatus === "pending" || genStatus === "generating";

  if (!brands.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-full bg-[var(--surface-2)] p-5">
          <Layout className="h-8 w-8 text-[var(--text-muted)]" />
        </div>
        <div>
          <p className="font-medium text-[var(--text-primary)]">No ready brands</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Create and train a brand first before generating posters
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 gap-8 min-h-0">
      {/* Left panel — controls */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-6 overflow-y-auto">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Textarea
            label="Describe your poster"
            name="prompt"
            placeholder="We are hiring a Senior Software Engineer. Remote-friendly, competitive salary…"
            rows={4}
            required
          />

          <Select
            label="Brand"
            name="brandId"
            options={brands.map((b) => ({ value: b.id, label: b.name }))}
            placeholder="Select a brand"
            required
          />

          <Select
            label="Format"
            name="format"
            options={FORMAT_OPTIONS}
            defaultValue="square"
          />

          {error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-500">
              {error}
            </p>
          )}

          <Button type="submit" loading={isGenerating} className="w-full">
            <Layout className="h-4 w-4" />
            {isGenerating ? "Generating…" : "Generate Poster"}
          </Button>
        </form>

        {/* Recent posters list */}
        {posters.length > 0 && (
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Recent Posters
            </h2>
            <ul className="flex flex-col gap-2">
              {posters.map((poster) => {
                const brand = poster.brands as { name: string } | null;
                return (
                  <li
                    key={poster.id}
                    className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3"
                  >
                    {/* Thumbnail */}
                    {poster.background_url ? (
                      <img
                        src={poster.background_url}
                        alt=""
                        className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)]">
                        <LayoutIcon className="h-5 w-5 text-[var(--text-muted)]" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-[var(--text-primary)]">
                        {truncate(poster.user_prompt, 60)}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        {brand?.name ?? ""} · {poster.format.replace(/_/g, " ")}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        {formatDate(poster.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(poster.id)}
                      disabled={deletingId === poster.id}
                      className="flex-shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-red-500 transition-colors disabled:opacity-50"
                      title="Delete poster"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Right panel — canvas / progress */}
      <div className="flex-1 min-w-0">
        <Card className="h-full">
          <CardContent className="flex h-full items-center justify-center p-6">
            {genStatus === "idle" && !completedLayout && (
              <div className="flex flex-col items-center gap-3 text-center text-[var(--text-muted)]">
                <Layout className="h-12 w-12 opacity-30" />
                <p className="text-sm">Your poster will appear here</p>
              </div>
            )}

            {(genStatus === "pending" || genStatus === "generating") && (
              <div className="flex flex-col items-center gap-6">
                <Spinner size="lg" />
                <div className="text-center">
                  <p className="font-medium text-[var(--text-primary)]">
                    {currentStage ? STAGE_LABELS[currentStage] ?? "Generating…" : "Generating…"}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    This usually takes 30–60 seconds
                  </p>
                  {/* Stage progress dots */}
                  <div className="mt-4 flex items-center justify-center gap-2">
                    {["intent", "layout", "background", "storage"].map((stage) => {
                      const stages = ["intent", "layout", "background", "storage"];
                      const current = currentStage ? stages.indexOf(currentStage) : -1;
                      const thisIdx = stages.indexOf(stage);
                      return (
                        <div
                          key={stage}
                          className={`h-2 w-2 rounded-full transition-colors ${
                            thisIdx <= current
                              ? "bg-[var(--accent)]"
                              : "bg-[var(--surface-2)]"
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {genStatus === "completed" && completedLayout && completedBackgroundUrl && completedPosterId && (
              <div className="h-full w-full">
                <PosterCanvas
                  layout={completedLayout}
                  backgroundUrl={completedBackgroundUrl}
                  posterId={completedPosterId}
                />
              </div>
            )}

            {genStatus === "failed" && (
              <div className="text-center">
                <p className="font-medium text-red-500">Generation failed</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
