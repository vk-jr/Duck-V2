import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Wand2, Layers, ShieldCheck, ArrowRight, Layout } from "lucide-react";
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
    <div className="p-8 max-w-[1200px]">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Hey, {firstName} 👋
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          Here&apos;s what&apos;s happening with your brands
        </p>
      </div>

      {/* Quick actions */}
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction
          href="/dashboard/generator"
          icon={<Wand2 className="h-4 w-4" />}
          title="Generate Image"
          description="Create brand-consistent images with AI"
          accent
        />
        <QuickAction
          href="/dashboard/brand/create"
          icon={<Layers className="h-4 w-4" />}
          title="New Brand"
          description="Upload references and build a brand"
        />
        <QuickAction
          href="/dashboard/poster-studio"
          icon={<Layout className="h-4 w-4" />}
          title="Poster Studio"
          description="Design layered, brand-consistent posters"
        />
        <QuickAction
          href="/dashboard/quality-checker"
          icon={<ShieldCheck className="h-4 w-4" />}
          title="Quality Check"
          description="Audit an image for brand compliance"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Brands */}
        <Card>
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Your Brands
            </h2>
            <Link
              href="/dashboard/brands"
              className="flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--accent)" }}
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <CardContent className="pt-0 p-3">
            {brands?.length ? (
              <ul className="flex flex-col">
                {brands.map((brand) => (
                  <li key={brand.id}>
                    <Link
                      href={`/dashboard/brand/${brand.id}`}
                      className="row-hover flex items-center justify-between px-3 py-2.5"
                    >
                      <span
                        className="text-sm font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
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
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Recent Images
            </h2>
            <Link
              href="/dashboard/gallery"
              className="flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--accent)" }}
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <CardContent className="p-4">
            {recentImages?.length ? (
              <div className="grid grid-cols-5 gap-2">
                {recentImages.map((img) => {
                  const urls = parseImageUrls(img.image_url);
                  if (!urls[0]) return null;
                  return (
                    <Link
                      key={img.id}
                      href="/dashboard/gallery"
                      className="group relative aspect-square overflow-hidden rounded-lg"
                      title={img.user_prompt ?? ""}
                      style={{ background: "var(--surface-2)" }}
                    >
                      <Image
                        src={urls[0]}
                        alt={img.user_prompt ?? "Generated image"}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-110"
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
  accent = false,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3.5 rounded-xl p-4 active:scale-[0.98] ${
        accent ? "quick-action-accent" : "quick-action-default"
      }`}
      style={{
        border: accent
          ? "1px solid color-mix(in srgb, var(--accent) 30%, transparent)"
          : "1px solid var(--border)",
        background: accent ? "var(--accent-subtle)" : "var(--surface-1)",
        boxShadow: accent ? "0 2px 8px var(--accent-glow)" : "var(--card-shadow)",
      }}
    >
      <div
        className="rounded-xl p-2.5 icon-hover"
        style={{
          background: accent
            ? "color-mix(in srgb, var(--accent) 20%, transparent)"
            : "var(--surface-2)",
          color: "var(--accent)",
        }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p
          className="truncate text-sm font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </p>
        <p
          className="truncate text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          {description}
        </p>
      </div>
      <ArrowRight
        className="ml-auto h-4 w-4 flex-shrink-0 opacity-0 transition-all duration-150 group-hover:translate-x-0.5 group-hover:opacity-100"
        style={{ color: "var(--accent)" }}
      />
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
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <Link
        href={href}
        className="text-sm font-medium transition-opacity hover:opacity-70"
        style={{ color: "var(--accent)" }}
      >
        {cta} →
      </Link>
    </div>
  );
}
