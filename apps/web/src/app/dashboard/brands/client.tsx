"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layers, Plus, ArrowRight } from "lucide-react";
import { formatDateShort } from "@/lib/utils";
import type { Brand, BrandImage } from "@/types";

type BrandWithImages = Brand & { brand_images: BrandImage[] };

export function BrandsClient({ brands: initial }: { brands: BrandWithImages[] }) {
  const [brands, setBrands] = useState(initial);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("brands-list")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "brands" },
        (payload) => {
          setBrands((prev) =>
            prev.map((b) =>
              b.id === payload.new.id ? { ...b, ...payload.new } : b
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!brands.length) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed py-20 text-center"
        style={{ borderColor: "var(--border)" }}
      >
        <div
          className="rounded-2xl p-5"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
        >
          <Layers className="h-8 w-8" style={{ color: "var(--text-subtle)" }} />
        </div>
        <div>
          <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
            No brands yet
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Create your first brand to start generating images
          </p>
        </div>
        <Link href="/dashboard/brand/create">
          <Button>
            <Plus className="h-4 w-4" /> Create brand
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {brands.map((brand) => {
        const thumbnails = [...(brand.brand_images ?? [])]
          .sort((a, b) => a.numbering - b.numbering)
          .slice(0, 4);

        return (
          <Link
            key={brand.id}
            href={`/dashboard/brand/${brand.id}`}
            className="group flex flex-col gap-0 overflow-hidden rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
            style={{
              border: "1px solid var(--border)",
              background: "var(--card-bg)",
              boxShadow: "var(--card-shadow)",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = "var(--border-strong)";
              el.style.boxShadow = "var(--card-shadow-hover)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = "var(--border)";
              el.style.boxShadow = "var(--card-shadow)";
            }}
          >
            {/* Thumbnail grid */}
            <div
              className="grid grid-cols-2 aspect-video overflow-hidden"
              style={{ background: "var(--surface-2)" }}
            >
              {thumbnails.length ? (
                thumbnails.map((img) => (
                  <div key={img.id} className="relative overflow-hidden">
                    <Image
                      src={img.image_url}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      unoptimized
                    />
                  </div>
                ))
              ) : (
                <div
                  className="col-span-2 flex items-center justify-center"
                  style={{ color: "var(--text-subtle)" }}
                >
                  <Layers className="h-8 w-8 opacity-30" />
                </div>
              )}
            </div>

            {/* Info */}
            <div
              className="flex items-center justify-between gap-2 px-4 py-3"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <div className="min-w-0">
                <p
                  className="truncate text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {brand.name}
                </p>
                <p className="text-xs" style={{ color: "var(--text-subtle)" }}>
                  {formatDateShort(brand.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <StatusBadge status={brand.status} />
                <ArrowRight
                  className="h-3.5 w-3.5 opacity-0 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0.5"
                  style={{ color: "var(--text-muted)" }}
                />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
