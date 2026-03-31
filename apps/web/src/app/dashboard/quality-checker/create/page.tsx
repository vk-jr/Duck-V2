"use client";

import { useState, useTransition } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server"; // NOT used client-side
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
import { Card, CardContent } from "@/components/ui/card";
import { createBrandGuidelines } from "./actions";
import Link from "next/link";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function CreateGuidelinesPage() {
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    createClient()
      .from("brands")
      .select("id, name")
      .then(({ data }) => setBrands(data ?? []));
  }, []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    if (file) formData.set("image", file);

    startTransition(async () => {
      const result = await createBrandGuidelines(formData);
      if (!result.success) {
        setError(result.error ?? "Failed");
      } else {
        setSuccess(true);
      }
    });
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <Link
          href="/dashboard/quality-checker"
          className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Create Brand Guidelines</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Upload a reference image and our AI will extract structured brand guidelines
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {success ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="font-semibold text-[var(--text-primary)]">
                Guidelines extraction started
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                The AI is analysing your reference image. Check back on your brand page in a moment.
              </p>
              <Link
                href="/dashboard/brands"
                className="mt-2 text-sm font-medium text-[var(--accent)] hover:underline"
              >
                Go to brands
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <Select
                label="Brand"
                name="brandId"
                options={brands.map((b) => ({ value: b.id, label: b.name }))}
                placeholder="Select a brand"
                required
              />

              <FileUpload
                label="Reference image (optional)"
                multiple={false}
                maxFiles={1}
                onFilesChange={(files) => setFile(files[0] ?? null)}
                hint="Upload a reference image to extract guidelines from"
              />

              <Textarea
                label="Additional instructions (optional)"
                name="instructions"
                placeholder="e.g. Focus on typography and spacing rules. The brand uses mostly muted tones…"
                rows={3}
              />

              {error && (
                <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-500">
                  {error}
                </p>
              )}

              <div className="flex justify-end">
                <Button type="submit" loading={isPending}>
                  Extract guidelines
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
