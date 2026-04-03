-- Migration 008: Change brand_guidelines column from text to jsonb
-- The column was originally text but stores structured JSON (BrandGuidelines).
-- Changing to jsonb so PostgREST returns a parsed object, not a raw string.

ALTER TABLE brands
  ALTER COLUMN brand_guidelines TYPE jsonb
  USING CASE
    WHEN brand_guidelines IS NULL THEN NULL
    ELSE brand_guidelines::jsonb
  END;
