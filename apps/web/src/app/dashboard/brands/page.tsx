import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BrandsClient } from "./client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { BrandWithImages } from "@/types";

export default async function BrandsPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: brands } = await supabase
    .from("brands")
    .select(`
      id, name, status, created_at,
      brand_images(id, image_url, numbering)
    `)
    .eq("created_by", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Brands</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {brands?.length ?? 0} brand{brands?.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/dashboard/brand/create">
          <Button>
            <Plus className="h-4 w-4" /> New Brand
          </Button>
        </Link>
      </div>

      <BrandsClient brands={(brands ?? []) as BrandWithImages[]} />
    </div>
  );
}
