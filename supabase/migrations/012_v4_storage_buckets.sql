-- V4: Storage buckets for the layered poster pipeline

-- ── poster-inputs (private) ───────────────────────────────────
-- Stores user-uploaded reference images used for img2img generation.
-- Private: only the uploading user and service role can access.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('poster-inputs', 'poster-inputs', false, 10485760)  -- 10 MB
ON CONFLICT (id) DO NOTHING;

-- ── poster-layers (public CDN) ────────────────────────────────
-- Stores transparent PNG layers output by Qwen segmentation.
-- Public: Fabric.js loads these directly via URL in the browser.
-- Privacy is maintained by unpredictable UUID paths.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('poster-layers', 'poster-layers', true, 10485760)
ON CONFLICT (id) DO NOTHING;

-- ── poster-backgrounds (public CDN) ──────────────────────────
-- Stores AI-generated canvas background images (when background.type = 'ai_image').
-- Public: same rationale as poster-layers.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('poster-backgrounds', 'poster-backgrounds', true, 10485760)
ON CONFLICT (id) DO NOTHING;

-- ── RLS: poster-inputs ────────────────────────────────────────
-- Authenticated users can upload to their own user folder only.
DROP POLICY IF EXISTS "Users upload own poster inputs" ON storage.objects;
CREATE POLICY "Users upload own poster inputs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'poster-inputs'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read their own uploads (for display in UI if needed).
DROP POLICY IF EXISTS "Users read own poster inputs" ON storage.objects;
CREATE POLICY "Users read own poster inputs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'poster-inputs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own uploads.
DROP POLICY IF EXISTS "Users delete own poster inputs" ON storage.objects;
CREATE POLICY "Users delete own poster inputs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'poster-inputs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
