"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, Plus } from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import Image from "next/image";

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSizeBytes?: number;
  onFilesChange: (files: File[]) => void;
  className?: string;
  label?: string;
  hint?: string;
}

export function FileUpload({
  accept = "image/*",
  multiple = true,
  maxFiles = 10,
  maxSizeBytes = 10 * 1024 * 1024,
  onFilesChange,
  className,
  label,
  hint,
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (incoming: FileList | null) => {
      if (!incoming) return;
      setError(null);

      const validFiles: File[] = [];
      for (const file of Array.from(incoming)) {
        if (!file.type.startsWith("image/")) {
          setError("Only image files are allowed");
          continue;
        }
        if (file.size > maxSizeBytes) {
          setError(`Files must be under ${formatBytes(maxSizeBytes)}`);
          continue;
        }
        validFiles.push(file);
      }

      const combined = [...files, ...validFiles].slice(0, maxFiles);
      setFiles(combined);
      onFilesChange(combined);

      const newPreviews = combined.map((f) => URL.createObjectURL(f));
      setPreviews((prev) => {
        prev.forEach((url) => URL.revokeObjectURL(url));
        return newPreviews;
      });
    },
    [files, maxFiles, maxSizeBytes, onFilesChange]
  );

  function removeFile(index: number) {
    URL.revokeObjectURL(previews[index]);
    const updated = files.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);
    setFiles(updated);
    setPreviews(updatedPreviews);
    onFilesChange(updated);
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {label && (
        <label
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-secondary)" }}
        >
          {label}
        </label>
      )}

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center",
          "transition-all duration-200",
          dragOver
            ? "border-[var(--accent)] bg-[var(--accent-glow)] scale-[0.995]"
            : "border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--accent)] hover:bg-[var(--surface-3)]"
        )}
      >
        <div
          className="rounded-xl p-3 transition-transform duration-200"
          style={{
            background: "var(--accent-subtle)",
            border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
          }}
        >
          <Upload className="h-5 w-5" style={{ color: "var(--accent)" }} />
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Drop images here or click to browse
          </p>
          <p className="mt-0.5 text-xs" style={{ color: "var(--text-subtle)" }}>
            {hint ?? `Up to ${maxFiles} images · max ${formatBytes(maxSizeBytes)} each`}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {error && (
        <p className="text-xs" style={{ color: "var(--status-error)" }}>
          {error}
        </p>
      )}

      {/* Preview grid */}
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {previews.map((src, i) => (
            <div
              key={i}
              className="group relative aspect-square overflow-hidden rounded-lg"
              style={{ background: "var(--surface-2)" }}
            >
              <Image
                src={src}
                alt={`Preview ${i + 1}`}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                unoptimized
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 transition-colors duration-150 group-hover:bg-black/30" />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                className="absolute right-1 top-1 rounded-full p-1 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
                style={{ background: "rgba(0,0,0,0.6)" }}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {/* Add more slot */}
          {files.length < maxFiles && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed transition-all duration-150"
              style={{
                borderColor: "var(--border)",
                color: "var(--text-subtle)",
                background: "var(--surface-2)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.color = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.color = "var(--text-subtle)";
              }}
            >
              <Plus className="h-4 w-4" />
              <span className="text-[10px] font-medium">Add</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
