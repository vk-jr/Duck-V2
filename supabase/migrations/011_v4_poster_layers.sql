-- V4: Poster layers table, source image column, updated stage constraint

-- ── Add source_image_url to posters ──────────────────────────
-- Stores the storage path of the user-uploaded reference image (if any).
-- Null for text-only poster generation.
ALTER TABLE posters ADD COLUMN IF NOT EXISTS source_image_url text;

-- ── poster_layers table ───────────────────────────────────────
-- One row per Qwen output layer. layer_index 0 = foreground (topmost).
CREATE TABLE IF NOT EXISTS poster_layers (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  poster_id    uuid NOT NULL REFERENCES posters(id) ON DELETE CASCADE,
  layer_index  integer NOT NULL,
  layer_url    text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS poster_layers_poster_id_idx ON poster_layers (poster_id);

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE poster_layers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own poster layers" ON poster_layers;
CREATE POLICY "Users view own poster layers" ON poster_layers
  FOR SELECT
  USING (
    poster_id IN (SELECT id FROM posters WHERE created_by = auth.uid())
  );

DROP POLICY IF EXISTS "Service role manages poster layers" ON poster_layers;
CREATE POLICY "Service role manages poster layers" ON poster_layers
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── Update poster_jobs.current_stage constraint ───────────────
-- Clear v3 stage values on completed/failed jobs before tightening the constraint.
-- Active jobs won't exist at migration time; completed ones don't need the stage field.
UPDATE poster_jobs
  SET current_stage = NULL
  WHERE current_stage IN ('intent', 'layout', 'background', 'storage');

ALTER TABLE poster_jobs
  DROP CONSTRAINT IF EXISTS poster_jobs_current_stage_check;

ALTER TABLE poster_jobs
  ADD CONSTRAINT poster_jobs_current_stage_check
  CHECK (current_stage IN (
    'generating',
    'segmenting',
    'analysing',
    'designing',
    'background',
    'finishing'
  ));

-- ── Realtime ──────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'poster_layers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE poster_layers;
  END IF;
END $$;
