import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PosterStudioClient } from "./client";

export default async function PosterStudioPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [brandsResult, postersResult] = await Promise.all([
    supabase
      .from("brands")
      .select("id, name, status")
      .eq("created_by", user.id)
      .eq("status", "ready")
      .order("created_at", { ascending: false }),

    supabase
      .from("posters")
      .select(
        "id, user_prompt, format, status, preview_url, background_url, hero_image_url, error_message, created_at, brands(name), poster_layers(layer_index, layer_url)"
      )
      .eq("created_by", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const brands = brandsResult.data ?? [];

  // Map poster_layers rows into a sorted layer_urls array
  const posters: PosterRow[] = (postersResult.data ?? []).map((p) => {
    const rawLayers = (p.poster_layers ?? []) as Array<{ layer_index: number; layer_url: string }>;
    const layer_urls = rawLayers
      .sort((a, b) => a.layer_index - b.layer_index)
      .map((l) => l.layer_url);

    return {
      id: p.id,
      user_prompt: p.user_prompt,
      format: p.format,
      status: p.status,
      preview_url: p.preview_url,
      background_url: p.background_url,
      hero_image_url: p.hero_image_url,
      error_message: p.error_message,
      created_at: p.created_at,
      brands: p.brands as { name: string } | null,
      layer_urls,
    };
  });

  return (
    <div className="flex h-full flex-col p-8">
      <div className="mb-8">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Poster Studio
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          Generate brand-consistent layered posters with AI — edit every layer directly on canvas
        </p>
      </div>
      <PosterStudioClient brands={brands} initialPosters={posters} />
    </div>
  );
}

export interface PosterRow {
  id: string;
  user_prompt: string;
  format: string;
  status: string;
  preview_url: string | null;
  background_url: string | null;
  hero_image_url: string | null;
  error_message: string | null;
  created_at: string;
  brands: { name: string } | null;
  layer_urls: string[]; // sorted by layer_index ascending (0 = foreground)
}
