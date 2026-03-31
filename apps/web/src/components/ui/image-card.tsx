"use client";

import { useState } from "react";
import Image from "next/image";
import { Download, Trash2, Link, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageCardProps {
  src: string;
  alt?: string;
  onDelete?: () => void;
  className?: string;
}

export function ImageCard({ src, alt = "Generated image", onDelete, className }: ImageCardProps) {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(src);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const a = document.createElement("a");
    a.href = src;
    a.download = `duck-image-${Date.now()}.png`;
    a.target = "_blank";
    a.click();
  }

  return (
    <div
      className={cn("group relative overflow-hidden rounded-xl bg-[var(--surface-2)]", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Image
        src={src}
        alt={alt}
        width={512}
        height={512}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        unoptimized
      />

      {/* Hover overlay */}
      {hovered && (
        <div className="absolute inset-0 flex items-end justify-end gap-2 bg-gradient-to-t from-black/60 via-transparent to-transparent p-3">
          <button
            onClick={handleCopy}
            title="Copy URL"
            className="rounded-lg bg-white/10 p-2 text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
          >
            {copied ? <Check className="h-4 w-4" /> : <Link className="h-4 w-4" />}
          </button>
          <button
            onClick={handleDownload}
            title="Download"
            className="rounded-lg bg-white/10 p-2 text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
          >
            <Download className="h-4 w-4" />
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              title="Delete"
              className="rounded-lg bg-red-500/80 p-2 text-white backdrop-blur-sm hover:bg-red-600 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
