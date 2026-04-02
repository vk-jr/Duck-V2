-- V3: Poster Studio tables, RLS, Realtime, and storage bucket

-- ── posters table ─────────────────────────────────────────────
CREATE TABLE posters (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id       uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  created_by     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_prompt    text NOT NULL,
  format         text NOT NULL CHECK (format IN ('square', 'portrait_a4', 'landscape_16_9', 'story_9_16')),
  layout_json    jsonb,
  background_url text,
  status         text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  error_message  text,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX ON posters (created_by, status);
CREATE INDEX ON posters (brand_id);
CREATE INDEX ON posters (created_at DESC);

-- ── poster_jobs table ─────────────────────────────────────────
CREATE TABLE poster_jobs (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  poster_id     uuid NOT NULL UNIQUE REFERENCES posters(id) ON DELETE CASCADE,
  bull_job_id   text,
  status        text NOT NULL DEFAULT 'queued'
                CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'retrying')),
  current_stage text CHECK (current_stage IN ('intent', 'layout', 'background', 'storage')),
  attempt_count integer NOT NULL DEFAULT 0,
  error_details jsonb,
  started_at    timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz DEFAULT now()
);

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE posters ENABLE ROW LEVEL SECURITY;
ALTER TABLE poster_jobs ENABLE ROW LEVEL SECURITY;

-- Users can fully manage their own posters
CREATE POLICY "Users manage own posters" ON posters
  FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Users can only read their own poster_jobs (via poster ownership)
CREATE POLICY "Users view own poster jobs" ON poster_jobs
  FOR SELECT
  USING (
    poster_id IN (SELECT id FROM posters WHERE created_by = auth.uid())
  );

-- Worker (service role) can insert and update poster_jobs
CREATE POLICY "Service role manages poster jobs" ON poster_jobs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── Realtime ──────────────────────────────────────────────────
-- Frontend subscribes to posters table for live status updates
ALTER PUBLICATION supabase_realtime ADD TABLE posters;
ALTER PUBLICATION supabase_realtime ADD TABLE poster_jobs;

-- ── Storage bucket ───────────────────────────────────────────
-- Public CDN bucket for poster background images
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('posters', 'posters', true, 52428800)
ON CONFLICT (id) DO NOTHING;
