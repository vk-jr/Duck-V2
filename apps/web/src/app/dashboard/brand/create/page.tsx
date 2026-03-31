"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
import { Card, CardContent } from "@/components/ui/card";
import { createBrand } from "./actions";
import { ArrowLeft } from "lucide-react";
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
          className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to brands
        </Link>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Create Brand</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Upload reference images and our AI will learn your brand&apos;s visual style.
        </p>
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
              <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-500">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-[var(--text-muted)]">
                {files.length} image{files.length !== 1 ? "s" : ""} selected
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
