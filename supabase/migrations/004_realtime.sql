-- ============================================================
-- DUCK — Enable Supabase Realtime for key tables
-- Run this in the Supabase SQL editor AFTER creating the tables
-- ============================================================

-- These tables need Realtime so the frontend can react to
-- worker updates without polling.
ALTER PUBLICATION supabase_realtime ADD TABLE generated_images;
ALTER PUBLICATION supabase_realtime ADD TABLE brands;
ALTER PUBLICATION supabase_realtime ADD TABLE quality_checks;
