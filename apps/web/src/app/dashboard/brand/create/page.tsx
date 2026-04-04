"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
import { Card, CardContent } from "@/components/ui/card";
import { createBrand } from "./actions";
import { ArrowLeft, Layers } from "lucide-react";
import Link from "next/link";

export default function CreateBrandPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    files.forEach((file) => formData.append("images", file));

    startTransition(async () => {
      const result = await createBrand(formData);
      if (result && !result.success) {
        setError(result.error ?? "Something went wrong");
      }
    });
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <Link
          href="/dashboard/brands"
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to brands
        </Link>

        <div className="flex items-center gap-3 mt-4">
          <div
            className="rounded-xl p-2.5"
            style={{
              background: "var(--accent-subtle)",
              border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
              color: "var(--accent)",
            }}
          >
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Create Brand
            </h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Upload reference images and our AI will learn your brand&apos;s visual style.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <Input
              label="Brand name"
              name="name"
              placeholder="e.g. Acme Corp"
              required
            />

            <FileUpload
              label="Reference images"
              multiple
              maxFiles={10}
              maxSizeBytes={10 * 1024 * 1024}
              onFilesChange={setFiles}
              hint="Upload 4–10 reference images that represent your brand's visual style. More images = better results."
            />

            {error && (
              <div
                className="rounded-lg px-3 py-2.5 text-sm"
                style={{
                  background: "color-mix(in srgb, var(--status-error) 8%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--status-error) 25%, transparent)",
                  color: "var(--status-error)",
                }}
              >
                {error}
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <p className="text-xs" style={{ color: "var(--text-subtle)" }}>
                {files.length
                  ? `${files.length} image${files.length !== 1 ? "s" : ""} selected`
                  : "4–10 images required"}
              </p>
              <Button
                type="submit"
                loading={isPending}
                disabled={!files.length}
              >
                {isPending ? "Creating brand…" : "Create brand"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
