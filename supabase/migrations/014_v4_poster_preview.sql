-- V4: Preview URL for the final composed poster (captured from canvas).
-- Stored as a JPEG thumbnail so the pages strip can show what was actually designed,
-- not just the raw background or layer image.
ALTER TABLE posters ADD COLUMN IF NOT EXISTS preview_url text;
