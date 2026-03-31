-- v5: Add completion tracking columns to saved_assignments
-- Run this on an existing Supabase project that already has the schema.sql base applied.
-- For a fresh project, schema.sql already includes these columns.

ALTER TABLE saved_assignments
  ADD COLUMN IF NOT EXISTS title        TEXT,
  ADD COLUMN IF NOT EXISTS due_date     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
