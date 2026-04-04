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
import { Layout, Trash2, LayoutIcon, ImagePlus, X } from "lucide-react";
import type { PosterLayout } from "@/types";
import type { PosterRow } from "./page";

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
  generating:  "Generating poster image…",
  segmenting:  "Separating image into layers…",
  analysing:   "Analysing composition…",
  designing:   "Designing your poster layout…",
  background:  "Generating brand background…",
  finishing:   "Assembling your poster…",
};

// Ordered for progress dots
const STAGE_ORDER = ["generating", "segmenting", "analysing", "designing", "background", "finishing"];

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
  const [completedLayerUrls, setCompletedLayerUrls] = useState<string[] | null>(null);
  const [completedPosterId, setCompletedPosterId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [posters, setPosters] = useState<PosterRow[]>(initialPosters);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loadingPosterId, setLoadingPosterId] = useState<string | null>(null);

  // Reference image state
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setReferenceFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setReferencePreview(url);
    } else {
      setReferencePreview(null);
    }
  }

  function clearReferenceFile() {
    setReferenceFile(null);
    setReferencePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Fetch completed poster with layers and fire canvas load
  async function loadCompletedPoster(id: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("posters")
      .select("layout_json, background_url, poster_layers(layer_index, layer_url)")
      .eq("id", id)
      .single();

    if (!data?.layout_json) return;

    const rawLayers = (data.poster_layers ?? []) as Array<{ layer_index: number; layer_url: string }>;
    const layerUrls = rawLayers
      .sort((a, b) => a.layer_index - b.layer_index)
      .map((l) => l.layer_url);

    setCompletedLayout(data.layout_json as PosterLayout);
    setCompletedBackgroundUrl(data.background_url);
    setCompletedLayerUrls(layerUrls);
    setCompletedPosterId(id);
    setGenStatus("completed");
  }

  async function handleLoadPoster(poster: PosterRow) {
    if (poster.status !== "completed") return;
    if (loadingPosterId === poster.id) return;
    setLoadingPosterId(poster.id);
    await loadCompletedPoster(poster.id);
    setLoadingPosterId(null);
  }

  // Subscribe to realtime updates for the active poster
  useEffect(() => {
    if (!posterId) return;

    const supabase = createClient();
    let intervalId: ReturnType<typeof setInterval>;

    const channel = supabase
      .channel(`poster-${posterId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "posters", filter: `id=eq.${posterId}` },
        (payload) => {
          const row = payload.new as { status: string; error_message: string | null };
          if (row.status === "completed") {
            clearInterval(intervalId);
            supabase.removeChannel(channel);
            loadCompletedPoster(posterId);
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
        { event: "UPDATE", schema: "public", table: "poster_jobs", filter: `poster_id=eq.${posterId}` },
        (payload) => {
          const row = payload.new as { current_stage: string | null };
          if (row.current_stage) setCurrentStage(row.current_stage);
        }
      )
      .subscribe();

    // Polling fallback every 4 seconds
    intervalId = setInterval(async () => {
      const { data } = await supabase
        .from("posters")
        .select("status, error_message")
        .eq("id", posterId)
        .single();

      if (data?.status === "completed") {
        clearInterval(intervalId);
        supabase.removeChannel(channel);
        loadCompletedPoster(posterId);
      } else if (data?.status === "failed") {
        setGenStatus("failed");
        setError(data.error_message ?? "Poster generation failed");
        clearInterval(intervalId);
        supabase.removeChannel(channel);
      }

      const { data: jobData } = await supabase
        .from("poster_jobs")
        .select("current_stage")
        .eq("poster_id", posterId)
        .single();

      if (jobData?.current_stage) setCurrentStage(jobData.current_stage);
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
    setCompletedLayerUrls(null);
    setCompletedPosterId(null);
    setCurrentStage(null);
    setPosterId(null);
    setGenStatus("pending");

    const formData = new FormData(e.currentTarget);
    // Attach the reference file (if any) — server action reads it as "referenceImage"
    if (referenceFile) {
      formData.set("referenceImage", referenceFile);
    }

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

          {/* Optional reference image */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
              Reference image <span className="normal-case font-normal">(optional)</span>
            </label>

            {referencePreview ? (
              <div className="relative w-full rounded-xl border border-[var(--border)] overflow-hidden">
                <img
                  src={referencePreview}
                  alt="Reference"
                  className="w-full h-32 object-cover"
                />
                <button
                  type="button"
                  onClick={clearReferenceFile}
                  className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 text-sm text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--text-primary)] transition-colors w-full"
              >
                <ImagePlus className="h-4 w-4 flex-shrink-0" />
                <span>Upload a product or person photo</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />

            <p className="text-[10px] text-[var(--text-muted)]">
              Used to generate the poster image. JPEG, PNG or WebP · max 10 MB
            </p>
          </div>

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
                // Thumbnail: use first available layer (foreground) or background_url
                // background_url is an opaque image; layer 0 is a transparent PNG — not useful as thumb
                const thumbUrl = poster.background_url ?? poster.layer_urls?.[1];
                const isSelected = completedPosterId === poster.id;
                const isLoading = loadingPosterId === poster.id;
                const isCompleted = poster.status === "completed";

                return (
                  <li
                    key={poster.id}
                    onClick={() => handleLoadPoster(poster)}
                    className={[
                      "flex items-start gap-3 rounded-xl border p-3 transition-colors",
                      isCompleted ? "cursor-pointer" : "cursor-default opacity-60",
                      isSelected
                        ? "border-[var(--accent)] bg-[var(--surface-1)]"
                        : "border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--accent)]/50",
                    ].join(" ")}
                  >
                    {/* Thumbnail */}
                    <div className="relative flex-shrink-0">
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt=""
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--surface-2)]">
                          <LayoutIcon className="h-5 w-5 text-[var(--text-muted)]" />
                        </div>
                      )}
                      {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
                          <Spinner size="sm" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-[var(--text-primary)]">
                        {truncate(poster.user_prompt, 60)}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        {brand?.name ?? ""} · {poster.format.replace(/_/g, " ")}
                      </p>
                      {poster.layer_urls?.length ? (
                        <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                          {poster.layer_urls.length} layers
                        </p>
                      ) : null}
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        {formatDate(poster.created_at)}
                      </p>
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(poster.id); }}
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
        {genStatus === "completed" && completedLayout && completedLayerUrls && completedPosterId ? (
          /* Canvas editor fills the full panel — no card padding */
          <div className="h-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] shadow-sm overflow-hidden">
            <PosterCanvas
              layout={completedLayout}
              layerUrls={completedLayerUrls}
              backgroundUrl={completedBackgroundUrl}
              posterId={completedPosterId}
            />
          </div>
        ) : (
          <Card className="h-full">
            <CardContent className="flex h-full items-center justify-center p-6">
              {genStatus === "idle" && (
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
                      {currentStage
                        ? STAGE_LABELS[currentStage] ?? "Generating…"
                        : "Starting generation…"}
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      This usually takes 45–90 seconds
                    </p>
                    {/* Stage progress dots */}
                    <div className="mt-4 flex items-center justify-center gap-2">
                      {STAGE_ORDER.map((stage) => {
                        const current = currentStage ? STAGE_ORDER.indexOf(currentStage) : -1;
                        const thisIdx = STAGE_ORDER.indexOf(stage);
                        return (
                          <div
                            key={stage}
                            className={`h-2 w-2 rounded-full transition-colors ${
                              thisIdx <= current
                                ? "bg-[var(--accent)]"
                                : "bg-[var(--surface-2)]"
                            }`}
                            title={STAGE_LABELS[stage]}
                          />
                        );
                      })}
                    </div>
                  </div>
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
        )}
      </div>
    </div>
  );
}
