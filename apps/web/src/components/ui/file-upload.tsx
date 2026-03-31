"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
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
  maxSizeBytes = 10 * 1024 * 1024, // 10MB
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

      // Generate previews
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
        <label className="text-sm font-medium text-[var(--text-primary)]">
          {label}
        </label>
      )}

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-2)] p-8 text-center transition-colors hover:border-[var(--accent)] hover:bg-[var(--surface-3)]",
          dragOver && "border-[var(--accent)] bg-[var(--accent)]/5"
        )}
      >
        <div className="rounded-full bg-[var(--accent)]/10 p-3">
          <Upload className="h-6 w-6 text-[var(--accent)]" />
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            Drop images here or click to browse
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {hint ?? `Up to ${maxFiles} images, max ${formatBytes(maxSizeBytes)} each`}
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

      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Preview grid */}
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {previews.map((src, i) => (
            <div key={i} className="group relative aspect-square overflow-hidden rounded-lg bg-[var(--surface-2)]">
              <Image
                src={src}
                alt={`Preview ${i + 1}`}
                fill
                className="object-cover"
                unoptimized
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(i);
                }}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
              <div className="absolute bottom-1 left-1 right-1 truncate rounded bg-black/40 px-1 py-0.5 text-[10px] text-white">
                {files[i]?.name}
              </div>
            </div>
          ))}

          {/* Add more slot */}
          {files.length < maxFiles && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--surface-2)] flex flex-col items-center justify-center gap-1 text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
            >
              <ImageIcon className="h-5 w-5" />
              <span className="text-xs">Add</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
