"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { startGeneration } from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { FileUpload } from "@/components/ui/file-upload";
import { ImageCard } from "@/components/ui/image-card";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import { parseImageUrls } from "@/lib/utils";
import { Wand2, ImageIcon, Sparkles } from "lucide-react";
import Link from "next/link";

interface Brand {
  id: string;
  name: string;
  status: string;
}

export function GeneratorClient({ brands }: { brands: Brand[] }) {
  const [generatedImageId, setGeneratedImageId] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [genStatus, setGenStatus] = useState<"idle" | "pending" | "generating" | "completed" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const channelRef = useRef<ReturnType<typeof createClient>["channel"] | null>(null);

  useEffect(() => {
    if (!generatedImageId) return;

    const supabase = createClient();
    let intervalId: ReturnType<typeof setInterval>;

    const channel = supabase
      .channel(`gen-${generatedImageId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "generated_images",
          filter: `id=eq.${generatedImageId}`,
        },
        (payload) => {
          const row = payload.new as { status: string; image_url: string | null; error_message: string | null };
          setGenStatus(row.status as typeof genStatus);

          if (row.status === "completed" && row.image_url) {
            setImageUrls(parseImageUrls(row.image_url));
            supabase.removeChannel(channel);
            if (intervalId) clearInterval(intervalId);
          }
          if (row.status === "failed") {
            setError(row.error_message ?? "Generation failed");
            supabase.removeChannel(channel);
            if (intervalId) clearInterval(intervalId);
          }
        }
      )
      .subscribe();

    intervalId = setInterval(async () => {
      const { data, error } = await supabase
        .from("generated_images")
        .select("status, image_url, error_message")
        .eq("id", generatedImageId)
        .single();

      if (!error && data) {
        if (data.status === "completed" && data.image_url) {
          setGenStatus("completed");
          setImageUrls(parseImageUrls(data.image_url));
          clearInterval(intervalId);
          supabase.removeChannel(channel);
        } else if (data.status === "failed") {
          setGenStatus("failed");
          setError(data.error_message ?? "Generation failed");
          clearInterval(intervalId);
          supabase.removeChannel(channel);
        } else {
          setGenStatus(data.status as typeof genStatus);
        }
      }
    }, 3000);

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [generatedImageId]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setImageUrls([]);
    setGeneratedImageId(null);
    setGenStatus("pending");

    const formData = new FormData(e.currentTarget);
    if (inputFile) formData.set("inputImage", inputFile);
    startTransition(async () => {
      const result = await startGeneration(formData);
      if (!result.success) {
        setError(result.error ?? "Failed to start generation");
        setGenStatus("idle");
      } else if (result.data) {
        setGeneratedImageId(result.data.generatedImageId);
        setGenStatus("generating");
      }
    });
  }

  if (!brands.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
        <div
          className="rounded-2xl p-5"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
        >
          <Wand2 className="h-8 w-8" style={{ color: "var(--text-subtle)" }} />
        </div>
        <div>
          <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
            No ready brands
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Create and train a brand first before generating images
          </p>
        </div>
        <Link href="/dashboard/brand/create">
          <Button>Create a brand</Button>
        </Link>
      </div>
    );
  }

  const isGenerating = isPending || genStatus === "generating" || genStatus === "pending";

  return (
    <div className="flex flex-1 gap-6 min-h-0">
      {/* Left panel — controls */}
      <div
        className="w-[300px] flex-shrink-0 rounded-xl p-5"
        style={{
          border: "1px solid var(--border)",
          background: "var(--surface-1)",
          boxShadow: "var(--card-shadow)",
        }}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FileUpload
            label="Reference image (optional)"
            multiple={false}
            maxFiles={1}
            maxSizeBytes={10 * 1024 * 1024}
            onFilesChange={(files) => setInputFile(files[0] ?? null)}
            hint="FLUX Kontext will reimagine this image in your brand's style"
          />

          <Textarea
            label="Prompt"
            name="prompt"
            placeholder="A product photo of our new headphones on a marble surface, soft natural light…"
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

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Images"
              name="imageCount"
              options={[
                { value: "1", label: "1 image" },
                { value: "2", label: "2 images" },
                { value: "4", label: "4 images" },
              ]}
              defaultValue="1"
            />
            <Select
              label="Ratio"
              name="aspectRatio"
              options={[
                { value: "1:1", label: "Square 1:1" },
                { value: "16:9", label: "Wide 16:9" },
                { value: "9:16", label: "Tall 9:16" },
              ]}
              defaultValue="1:1"
            />
          </div>

          <Select
            label="Resolution"
            name="resolution"
            options={[
              { value: "1K", label: "1K — 1024px" },
              { value: "2K", label: "2K — 2048px" },
              { value: "4K", label: "4K — 3840px" },
            ]}
            defaultValue="1K"
          />

          {error && (
            <div
              className="rounded-lg px-3 py-2.5 text-sm"
              style={{
                background: "color-mix(in srgb, var(--status-error) 8%, transparent)",
                border: "1px solid color-mix(in srgb, var(--status-error) 25%, transparent)",
                color: "var(--status-error)",
              }}
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            loading={isGenerating}
            className="w-full mt-1"
            size="lg"
          >
            {!isGenerating && <Wand2 className="h-4 w-4" />}
            {isGenerating ? "Generating…" : "Generate"}
          </Button>
        </form>
      </div>

      {/* Right panel — results */}
      <div className="flex-1 min-w-0">
        <Card className="h-full">
          <CardContent className="flex h-full items-center justify-center p-6">
            {genStatus === "idle" && !imageUrls.length && (
              <div className="flex flex-col items-center gap-4 text-center">
                <div
                  className="rounded-2xl p-6"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <ImageIcon
                    className="h-10 w-10"
                    style={{ color: "var(--text-subtle)" }}
                  />
                </div>
                <div>
                  <p
                    className="font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Your generated images will appear here
                  </p>
                  <p
                    className="mt-1 text-sm"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Fill in the form on the left and hit Generate
                  </p>
                </div>
              </div>
            )}

            {isGenerating && (
              <div className="flex flex-col items-center gap-5">
                <div className="relative">
                  <div
                    className="rounded-full p-5"
                    style={{
                      background: "var(--accent-subtle)",
                      border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
                    }}
                  >
                    <Sparkles
                      className="h-8 w-8"
                      style={{
                        color: "var(--accent)",
                        animation: "dot-pulse 2s ease-in-out infinite",
                      }}
                    />
                  </div>
                  <div className="absolute -right-1 -top-1">
                    <Spinner size="sm" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    Generating your images
                  </p>
                  <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                    This usually takes 15–45 seconds
                  </p>
                </div>
                {/* Progress steps */}
                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-subtle)" }}>
                  {["Picking references", "Building prompt", "Rendering"].map((step, i) => (
                    <span key={step} className="flex items-center gap-2">
                      {i > 0 && <span style={{ color: "var(--border-strong)" }}>→</span>}
                      <span
                        className="flex items-center gap-1"
                        style={{ color: i === 1 ? "var(--accent)" : "var(--text-subtle)" }}
                      >
                        {step}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {genStatus === "completed" && imageUrls.length > 0 && (
              <div
                className={`grid h-full w-full gap-3 ${
                  imageUrls.length === 1
                    ? "grid-cols-1"
                    : "grid-cols-2"
                }`}
              >
                {imageUrls.map((url, i) => (
                  <ImageCard key={i} src={url} className="min-h-0" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
