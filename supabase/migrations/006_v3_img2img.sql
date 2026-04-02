-- V3: img2img extension
-- Adds optional input_image_url column to generated_images (non-breaking, nullable)

ALTER TABLE generated_images
  ADD COLUMN input_image_url text;

-- New private storage bucket for user-uploaded product/reference images
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('input-images', 'input-images', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- RLS: users can only access their own files in input-images/
CREATE POLICY "Users access own input images"
ON storage.objects FOR ALL
USING (bucket_id = 'input-images' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'input-images' AND auth.uid()::text = (storage.foldername(name))[1]);
