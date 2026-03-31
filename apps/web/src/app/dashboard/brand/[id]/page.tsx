import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BrandDetailClient } from "./client";

export default async function BrandDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: brand } = await supabase
    .from("brands")
    .select(`
      *,
      brand_images(id, image_url, numbering),
      reference_images(id, image_url, content_description, style_description)
    `)
    .eq("id", id)
    .eq("created_by", user.id)
    .single();

  if (!brand) notFound();

  return <BrandDetailClient brand={brand} />;
}
