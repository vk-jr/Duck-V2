-- ============================================================
-- DUCK — Row Level Security Policies
-- The worker uses the service_role key which bypasses RLS.
-- All web app queries use the anon key with RLS enforced.
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE reference_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_logs ENABLE ROW LEVEL SECURITY;

-- ── profiles ────────────────────────────────────────────────
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ── brands ──────────────────────────────────────────────────
CREATE POLICY "Users can view brands they created or are members of"
  ON brands FOR SELECT
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM brand_members
      WHERE brand_members.brand_id = brands.id
      AND brand_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create brands"
  ON brands FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners can update their brands"
  ON brands FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Owners can delete their brands"
  ON brands FOR DELETE
  USING (auth.uid() = created_by);

-- ── brand_members ────────────────────────────────────────────
CREATE POLICY "Users can view brand memberships for their brands"
  ON brand_members FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM brands WHERE brands.id = brand_members.brand_id AND brands.created_by = auth.uid())
  );

-- ── brand_images ─────────────────────────────────────────────
CREATE POLICY "Users can view images for their brands"
  ON brand_images FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM brands WHERE brands.id = brand_images.brand_id AND brands.created_by = auth.uid())
  );

CREATE POLICY "Brand owners can insert brand images"
  ON brand_images FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM brands WHERE brands.id = brand_images.brand_id AND brands.created_by = auth.uid())
  );

CREATE POLICY "Brand owners can update brand images"
  ON brand_images FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM brands WHERE brands.id = brand_images.brand_id AND brands.created_by = auth.uid())
  );

CREATE POLICY "Brand owners can delete brand images"
  ON brand_images FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM brands WHERE brands.id = brand_images.brand_id AND brands.created_by = auth.uid())
  );

-- ── reference_images ─────────────────────────────────────────
CREATE POLICY "Users can view reference images for their brands"
  ON reference_images FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM brands WHERE brands.id = reference_images.brand_id AND brands.created_by = auth.uid())
  );

CREATE POLICY "Brand owners can delete reference images"
  ON reference_images FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM brands WHERE brands.id = reference_images.brand_id AND brands.created_by = auth.uid())
  );

-- Note: INSERT and UPDATE on reference_images is service_role only (worker handles this)

-- ── generated_images ─────────────────────────────────────────
CREATE POLICY "Users can view their own generated images"
  ON generated_images FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create generated image records"
  ON generated_images FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their generated images"
  ON generated_images FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their generated images"
  ON generated_images FOR DELETE
  USING (auth.uid() = created_by);

-- ── image_generation_jobs ────────────────────────────────────
CREATE POLICY "Users can view jobs for their generated images"
  ON image_generation_jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM generated_images
      WHERE generated_images.id = image_generation_jobs.generated_image_id
      AND generated_images.created_by = auth.uid()
    )
  );

-- INSERT and UPDATE is service_role only (web app inserts via server action with service role check)

-- ── quality_checks ───────────────────────────────────────────
CREATE POLICY "Users can view their own quality checks"
  ON quality_checks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create quality checks"
  ON quality_checks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their quality checks"
  ON quality_checks FOR DELETE
  USING (auth.uid() = user_id);

-- UPDATE is service_role only (worker updates result, score, status)

-- ── workflow_logs ─────────────────────────────────────────────
CREATE POLICY "Users can view their own workflow logs"
  ON workflow_logs FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT and UPDATE is service_role only (worker writes all logs)
