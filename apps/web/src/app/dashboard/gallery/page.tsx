import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GalleryClient } from "./client";

export default async function GalleryPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: images }, { data: brands }] = await Promise.all([
    supabase
      .from("generated_images")
      .select("id, image_url, user_prompt, alpha_prompt, created_at, brand_id, image_count, aspect_ratio, resolution")
      .eq("created_by", user!.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("brands")
      .select("id, name")
      .eq("created_by", user!.id),
  ]);

  const brandMap = Object.fromEntries((brands ?? []).map((b) => [b.id, b.name]));

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Gallery</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {images?.length ?? 0} completed generation{images?.length !== 1 ? "s" : ""}
        </p>
      </div>
      <GalleryClient images={images ?? []} brandMap={brandMap} brands={brands ?? []} />
    </div>
  );
}
