-- ============================================================
-- DUCK (Content Beta) — Initial Database Schema
-- Run this in the Supabase SQL editor
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. profiles ─────────────────────────────────────────────
-- One row per user. Created automatically by trigger on auth.users INSERT.
CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  full_name   text NOT NULL DEFAULT '',
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 2. brands ───────────────────────────────────────────────
-- Core entity. All image generation is done in the context of a brand.
CREATE TABLE brands (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              text NOT NULL,
  created_by        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  system_prompt     text,          -- AI-generated visual identity. Set after brand-creation job
  brand_guidelines  text,          -- AI-extracted structured guidelines. Set after quality checker create flow
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'failed')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_brands_created_by ON brands(created_by);

-- ── 3. brand_members ────────────────────────────────────────
-- Future team collaboration support
CREATE TABLE brand_members (
  brand_id   uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'editor', 'member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (brand_id, user_id)
);

CREATE INDEX idx_brand_members_user_id ON brand_members(user_id);

-- ── 4. brand_images ─────────────────────────────────────────
-- Original image files uploaded when creating a brand
CREATE TABLE brand_images (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id    uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  image_url   text NOT NULL,     -- Public URL in Supabase Storage: brand-images bucket
  numbering   integer NOT NULL,  -- Upload order (1, 2, 3...)
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_brand_images_brand_id ON brand_images(brand_id);

-- ── 5. reference_images ─────────────────────────────────────
-- AI knowledge table. Each brand image is analysed; style data stored here.
-- This table is searched during image generation to find best matching style.
CREATE TABLE reference_images (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id            uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  brand_image_id      uuid NOT NULL REFERENCES brand_images(id) ON DELETE CASCADE,
  image_url           text NOT NULL,   -- Same URL as brand_image (duplicated for query convenience)
  filename            text,
  content_description text,            -- What is in the image (subjects, objects, scene)
  style_description   text NOT NULL,   -- Visual style — searched during generation
  metadata            jsonb,           -- Extra extracted data (colours, mood, etc.)
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reference_images_brand_id ON reference_images(brand_id);

-- ── 6. generated_images ─────────────────────────────────────
-- Every generation request creates one row here immediately (before AI runs)
CREATE TABLE generated_images (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id      uuid NOT NULL REFERENCES brands(id),
  created_by    uuid NOT NULL REFERENCES profiles(id),
  user_prompt   text NOT NULL,        -- Raw prompt the user typed
  alpha_prompt  text,                 -- Final expanded prompt sent to image model (set by worker)
  image_url     text,                 -- Comma-separated Supabase Storage URLs when complete
  image_count   integer NOT NULL DEFAULT 1 CHECK (image_count IN (1, 2, 4)),
  aspect_ratio  text NOT NULL DEFAULT '1:1' CHECK (aspect_ratio IN ('1:1', '16:9', '9:16')),
  resolution    text NOT NULL DEFAULT '1K' CHECK (resolution IN ('1K', '2K', '4K')),
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  error_message text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_generated_images_created_by_status ON generated_images(created_by, status);
CREATE INDEX idx_generated_images_brand_id ON generated_images(brand_id);
CREATE INDEX idx_generated_images_created_at ON generated_images(created_at DESC);

-- ── 7. image_generation_jobs ────────────────────────────────
-- Tracks the state of each BullMQ background job.
CREATE TABLE image_generation_jobs (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  generated_image_id   uuid NOT NULL UNIQUE REFERENCES generated_images(id),
  bull_job_id          text,          -- BullMQ job ID. Set when job is successfully enqueued
  status               text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'retrying')),
  attempt_count        integer NOT NULL DEFAULT 0,
  error_details        jsonb,         -- Full error object on failure for debugging
  started_at           timestamptz,   -- When worker picked up the job
  completed_at         timestamptz,   -- When worker finished
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- ── 8. quality_checks ───────────────────────────────────────
CREATE TABLE quality_checks (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES auth.users(id),
  brand_id      uuid NOT NULL REFERENCES brands(id),
  image_url     text NOT NULL,         -- The image being checked (Supabase Storage URL)
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result        jsonb,                 -- Full structured result from AI quality agent
  score         integer CHECK (score >= 0 AND score <= 100),
  error_message text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quality_checks_user_id ON quality_checks(user_id);
CREATE INDEX idx_quality_checks_brand_id ON quality_checks(brand_id);

-- ── 9. workflow_logs ────────────────────────────────────────
-- Audit trail. Every job writes here at start and end.
CREATE TABLE workflow_logs (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_name  text NOT NULL,   -- image_generation | brand_creation | quality_check | brand_guidelines
  entity_id      uuid NOT NULL,   -- ID of the record this log is about
  entity_type    text NOT NULL,   -- Which table entity_id refers to
  user_id        uuid REFERENCES auth.users(id),
  status         text NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  duration_ms    integer,
  metadata       jsonb,           -- Extra context (model used, prompt length, etc.)
  error          jsonb,           -- Full error details if status is failed
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_logs_entity_id ON workflow_logs(entity_id);
CREATE INDEX idx_workflow_logs_user_id ON workflow_logs(user_id);
CREATE INDEX idx_workflow_logs_created_at ON workflow_logs(created_at DESC);
