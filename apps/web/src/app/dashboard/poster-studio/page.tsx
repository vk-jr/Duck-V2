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
      .select("id, user_prompt, format, status, background_url, error_message, created_at, brands(name)")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const brands = brandsResult.data ?? [];
  const posters = postersResult.data ?? [];

  return (
    <div className="flex h-full flex-col p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Poster Studio</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Generate brand-consistent posters with AI — edit text directly on the canvas
        </p>
      </div>
      <PosterStudioClient brands={brands} initialPosters={posters as unknown as PosterRow[]} />
    </div>
  );
}

export interface PosterRow {
  id: string;
  user_prompt: string;
  format: string;
  status: string;
  background_url: string | null;
  error_message: string | null;
  created_at: string;
  brands: { name: string } | null;
}
