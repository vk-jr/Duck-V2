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
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-[var(--border)] py-20 text-center">
        <div className="rounded-full bg-[var(--surface-2)] p-4">
          <Layers className="h-8 w-8 text-[var(--text-muted)]" />
        </div>
        <div>
          <p className="font-medium text-[var(--text-primary)]">No brands yet</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
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
            className="group flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 transition-colors hover:border-[var(--accent)]/50"
          >
            {/* Thumbnail grid */}
            <div className="grid grid-cols-2 gap-1.5 rounded-xl overflow-hidden aspect-video bg-[var(--surface-2)]">
              {thumbnails.length ? (
                thumbnails.map((img) => (
                  <div key={img.id} className="relative overflow-hidden bg-[var(--surface-2)]">
                    <Image
                      src={img.image_url}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ))
              ) : (
                <div className="col-span-2 flex items-center justify-center text-[var(--text-muted)]">
                  <Layers className="h-8 w-8 opacity-30" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold text-[var(--text-primary)]">
                  {brand.name}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {formatDateShort(brand.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <StatusBadge status={brand.status} />
                <ArrowRight className="h-4 w-4 text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
