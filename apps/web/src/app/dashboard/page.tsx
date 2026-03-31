import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Wand2, Layers, ShieldCheck, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { parseImageUrls, formatDate } from "@/lib/utils";
import Image from "next/image";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: brands }, { data: recentImages }, { data: profile }] =
    await Promise.all([
      supabase
        .from("brands")
        .select("id, name, status")
        .eq("created_by", user!.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("generated_images")
        .select("id, image_url, user_prompt, created_at, brand_id")
        .eq("created_by", user!.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user!.id)
        .single(),
    ]);

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Hey, {firstName}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Here&apos;s what&apos;s happening with your brands
        </p>
      </div>

      {/* Quick actions */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <QuickAction
          href="/dashboard/generator"
          icon={<Wand2 className="h-5 w-5" />}
          title="Generate Image"
          description="Create brand-consistent images with AI"
        />
        <QuickAction
          href="/dashboard/brand/create"
          icon={<Layers className="h-5 w-5" />}
          title="New Brand"
          description="Upload references and build a brand"
        />
        <QuickAction
          href="/dashboard/quality-checker"
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Quality Check"
          description="Audit an image for brand compliance"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Brands */}
        <Card>
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="font-semibold text-[var(--text-primary)]">Your Brands</h2>
            <Link
              href="/dashboard/brands"
              className="flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <CardContent className="pt-0">
            {brands?.length ? (
              <ul className="flex flex-col gap-2">
                {brands.map((brand) => (
                  <li key={brand.id}>
                    <Link
                      href={`/dashboard/brand/${brand.id}`}
                      className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-[var(--surface-2)] transition-colors"
                    >
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {brand.name}
                      </span>
                      <StatusBadge status={brand.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                label="No brands yet"
                cta="Create your first brand"
                href="/dashboard/brand/create"
              />
            )}
          </CardContent>
        </Card>

        {/* Recent images */}
        <Card>
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="font-semibold text-[var(--text-primary)]">Recent Images</h2>
            <Link
              href="/dashboard/gallery"
              className="flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <CardContent className="pt-0">
            {recentImages?.length ? (
              <div className="grid grid-cols-5 gap-2">
                {recentImages.map((img) => {
                  const urls = parseImageUrls(img.image_url);
                  if (!urls[0]) return null;
                  return (
                    <Link
                      key={img.id}
                      href="/dashboard/gallery"
                      className="group relative aspect-square overflow-hidden rounded-lg bg-[var(--surface-2)]"
                      title={img.user_prompt ?? ""}
                    >
                      <Image
                        src={urls[0]}
                        alt={img.user_prompt ?? "Generated image"}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        unoptimized
                      />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                label="No images yet"
                cta="Generate your first image"
                href="/dashboard/generator"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 transition-colors hover:border-[var(--accent)]/50 hover:bg-[var(--surface-2)]"
    >
      <div className="rounded-xl bg-[var(--accent)]/10 p-3 text-[var(--accent)] transition-colors group-hover:bg-[var(--accent)]/20">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
        <p className="text-xs text-[var(--text-muted)]">{description}</p>
      </div>
    </Link>
  );
}

function EmptyState({
  label,
  cta,
  href,
}: {
  label: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <Link
        href={href}
        className="text-sm font-medium text-[var(--accent)] hover:underline"
      >
        {cta}
      </Link>
    </div>
  );
}
