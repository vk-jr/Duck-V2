"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { startGeneration } from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { ImageCard } from "@/components/ui/image-card";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import { parseImageUrls } from "@/lib/utils";
import { Wand2, ImageIcon } from "lucide-react";
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
  const [isPending, startTransition] = useTransition();
  const channelRef = useRef<ReturnType<typeof createClient>["channel"] | null>(null);

  // Subscribe to realtime when we have a generatedImageId and add a polling fallback
  useEffect(() => {
    if (!generatedImageId) return;

    const supabase = createClient();
    
    // Declare interval id so both realtime and polling can clear it
    let intervalId: ReturnType<typeof setInterval>;

    // 1. Realtime subscription
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

    // 2. Polling fallback (every 3 seconds) incase realtime drops during long generations
    intervalId = setInterval(async () => {
      const { data, error } = await supabase
        .from("generated_images")
        .select("status, image_url, error_message")
        .eq("id", generatedImageId)
        .single();

      if (!error && data) {
        // Only update state if it's practically finished or we're somehow out of sync
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
          // just sync the pending/generating status in case we missed it
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
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-full bg-[var(--surface-2)] p-5">
          <Wand2 className="h-8 w-8 text-[var(--text-muted)]" />
        </div>
        <div>
          <p className="font-medium text-[var(--text-primary)]">No ready brands</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Create and train a brand first before generating images
          </p>
        </div>
        <Link href="/dashboard/brand/create">
          <Button>Create a brand</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 gap-8 min-h-0">
      {/* Left panel — controls */}
      <div className="w-80 flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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

          <Select
            label="Number of images"
            name="imageCount"
            options={[
              { value: "1", label: "1 image" },
              { value: "2", label: "2 images" },
              { value: "4", label: "4 images" },
            ]}
            defaultValue="1"
          />

          <Select
            label="Aspect ratio"
            name="aspectRatio"
            options={[
              { value: "1:1", label: "Square (1:1)" },
              { value: "16:9", label: "Landscape (16:9)" },
              { value: "9:16", label: "Portrait (9:16)" },
            ]}
            defaultValue="1:1"
          />

          <Select
            label="Resolution"
            name="resolution"
            options={[
              { value: "1K", label: "1K (1024px)" },
              { value: "2K", label: "2K (2048px)" },
              { value: "4K", label: "4K (3840px)" },
            ]}
            defaultValue="1K"
          />

          {error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-500">
              {error}
            </p>
          )}

          <Button
            type="submit"
            loading={isPending || genStatus === "generating" || genStatus === "pending"}
            className="w-full"
          >
            <Wand2 className="h-4 w-4" />
            {genStatus === "generating" ? "Generating…" : "Generate"}
          </Button>
        </form>
      </div>

      {/* Right panel — results */}
      <div className="flex-1 min-w-0">
        <Card className="h-full">
          <CardContent className="flex h-full items-center justify-center p-6">
            {genStatus === "idle" && !imageUrls.length && (
              <div className="flex flex-col items-center gap-3 text-center text-[var(--text-muted)]">
                <ImageIcon className="h-12 w-12 opacity-30" />
                <p className="text-sm">Your generated images will appear here</p>
              </div>
            )}

            {(genStatus === "pending" || genStatus === "generating") && (
              <div className="flex flex-col items-center gap-4">
                <Spinner size="lg" />
                <div className="text-center">
                  <p className="font-medium text-[var(--text-primary)]">Generating…</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    This usually takes 15–45 seconds
                  </p>
                </div>
              </div>
            )}

            {genStatus === "completed" && imageUrls.length > 0 && (
              <div
                className={`grid h-full w-full gap-3 ${
                  imageUrls.length === 1
                    ? "grid-cols-1"
                    : imageUrls.length === 2
                    ? "grid-cols-2"
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
