import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GeneratorClient } from "./client";

export default async function GeneratorPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: brands } = await supabase
    .from("brands")
    .select("id, name, status")
    .eq("created_by", user!.id)
    .eq("status", "ready")
    .order("created_at", { ascending: false });

  return (
    <div className="flex h-full flex-col p-8">
      <div className="mb-6">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Generator
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          Generate brand-consistent images with AI
        </p>
      </div>
      <GeneratorClient brands={brands ?? []} />
    </div>
  );
}
