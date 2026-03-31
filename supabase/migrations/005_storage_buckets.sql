-- ============================================================
-- DUCK — Supabase Storage Buckets
-- Run this in the Supabase SQL editor, OR create manually
-- in the Supabase dashboard under Storage > New Bucket
-- ============================================================

-- brand-images: Private. Reference photos uploaded during brand creation.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-images',
  'brand-images',
  false,
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- generated-images: Public (CDN). Final AI-generated images after permanent storage.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'generated-images',
  'generated-images',
  true,
  52428800,  -- 50MB (generated images can be large at 4K)
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- quality-checks: Private. Images uploaded for quality checking.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quality-checks',
  'quality-checks',
  false,
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ── Storage RLS Policies ─────────────────────────────────────

-- brand-images: Owner can read/write/delete their own files
CREATE POLICY "Users can upload their own brand images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'brand-images'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "Users can view their own brand images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'brand-images'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "Users can delete their own brand images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'brand-images'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- generated-images: Public bucket (anyone can read via CDN)
-- Worker uploads via service role (bypasses RLS)
CREATE POLICY "Anyone can view generated images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'generated-images');

CREATE POLICY "Users can delete their own generated images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'generated-images'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- quality-checks: Owner can read/write/delete their own files
CREATE POLICY "Users can upload their own quality check images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'quality-checks'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "Users can view their own quality check images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'quality-checks'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "Users can delete their own quality check images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'quality-checks'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );
