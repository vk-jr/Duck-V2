"use client";

import { useState, useTransition } from "react";
import { ImageCard } from "@/components/ui/image-card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { deleteGeneratedImage } from "./actions";
import { parseImageUrls, formatDate, truncate } from "@/lib/utils";
import { Images } from "lucide-react";

interface GeneratedImage {
  id: string;
  image_url: string | null;
  user_prompt: string | null;
  alpha_prompt: string | null;
  created_at: string;
  brand_id: string;
  image_count: number;
  aspect_ratio: string;
  resolution: string;
}

export function GalleryClient({
  images,
  brandMap,
  brands,
}: {
  images: GeneratedImage[];
  brandMap: Record<string, string>;
  brands: { id: string; name: string }[];
}) {
  const [filterBrand, setFilterBrand] = useState("");
  const [search, setSearch] = useState("");
  const [localImages, setLocalImages] = useState(images);
  const [isPending, startTransition] = useTransition();

  const filtered = localImages.filter((img) => {
    const matchesBrand = !filterBrand || img.brand_id === filterBrand;
    const matchesSearch =
      !search ||
      img.user_prompt?.toLowerCase().includes(search.toLowerCase());
    return matchesBrand && matchesSearch;
  });

  function handleDelete(imageId: string) {
    if (!confirm("Delete this image? This cannot be undone.")) return;
    setLocalImages((prev) => prev.filter((img) => img.id !== imageId));
    startTransition(async () => {
      await deleteGeneratedImage(imageId);
    });
  }

  if (!images.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-[var(--border)] py-20 text-center">
        <div className="rounded-full bg-[var(--surface-2)] p-4">
          <Images className="h-8 w-8 text-[var(--text-muted)]" />
        </div>
        <div>
          <p className="font-medium text-[var(--text-primary)]">No images yet</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Generate your first image in the Generator
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-56">
          <Input
            placeholder="Search prompts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Select
            options={[
              { value: "", label: "All brands" },
              ...brands.map((b) => ({ value: b.id, label: b.name })),
            ]}
            value={filterBrand}
            onChange={(e) => setFilterBrand(e.target.value)}
          />
        </div>
        <p className="text-sm text-[var(--text-muted)] ml-auto">
          {filtered.length} image{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-[var(--text-muted)]">
          No images match your filters
        </p>
      ) : (
        <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
          {filtered.flatMap((img) => {
            const urls = parseImageUrls(img.image_url);
            return urls.map((url, i) => (
              <div key={`${img.id}-${i}`} className="mb-4 break-inside-avoid">
                <ImageCard
                  src={url}
                  alt={img.user_prompt ?? "Generated image"}
                  onDelete={i === 0 ? () => handleDelete(img.id) : undefined}
                />
                {i === 0 && (
                  <div className="mt-2 px-1">
                    <p className="text-xs font-medium text-[var(--text-primary)] leading-snug">
                      {truncate(img.user_prompt ?? "Untitled", 80)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {brandMap[img.brand_id] && (
                        <Badge variant="default">{brandMap[img.brand_id]}</Badge>
                      )}
                      <span className="text-xs text-[var(--text-muted)]">
                        {formatDate(img.created_at)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ));
          })}
        </div>
      )}
    </div>
  );
}
