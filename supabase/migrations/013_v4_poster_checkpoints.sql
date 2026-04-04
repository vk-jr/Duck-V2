-- V4: Checkpoint columns for idempotent poster pipeline retries.
-- Each column stores the output of one pipeline stage.
-- On retry, the worker reads these and skips any stage already completed.

ALTER TABLE posters ADD COLUMN IF NOT EXISTS hero_image_url text;       -- Stage 1 output: permanent Supabase URL
ALTER TABLE posters ADD COLUMN IF NOT EXISTS composition_json jsonb;    -- Stage 3 output: Gemini composition analysis
