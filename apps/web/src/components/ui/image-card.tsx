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
      className={cn(
        "group relative overflow-hidden rounded-xl",
        className
      )}
      style={{ background: "var(--surface-2)" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Image
        src={src}
        alt={alt}
        width={512}
        height={512}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        unoptimized
      />

      {/* Hover overlay — gradient + actions */}
      <div
        className="absolute inset-0 transition-opacity duration-200"
        style={{
          opacity: hovered ? 1 : 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 40%, transparent 70%)",
        }}
      />

      {/* Action buttons */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center justify-end gap-1.5 p-2.5 transition-all duration-200"
        style={{
          opacity: hovered ? 1 : 0,
          transform: hovered ? "translateY(0)" : "translateY(4px)",
        }}
      >
        <button
          onClick={handleCopy}
          title="Copy URL"
          className="rounded-lg p-2 text-white backdrop-blur-md transition-colors"
          style={{ background: "rgba(255,255,255,0.12)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.22)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Link className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={handleDownload}
          title="Download"
          className="rounded-lg p-2 text-white backdrop-blur-md transition-colors"
          style={{ background: "rgba(255,255,255,0.12)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.22)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
        >
          <Download className="h-3.5 w-3.5" />
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            title="Delete"
            className="rounded-lg p-2 text-white backdrop-blur-md transition-colors"
            style={{ background: "rgba(220,38,38,0.7)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(220,38,38,0.9)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(220,38,38,0.7)")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
