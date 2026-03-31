-- v4: Add role and streak columns to canvas_users
-- Run this on an existing Supabase project that already has the schema.sql base applied.
-- For a fresh project, schema.sql already includes these columns.

ALTER TABLE canvas_users
  ADD COLUMN IF NOT EXISTS role   TEXT    NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  ADD COLUMN IF NOT EXISTS streak INTEGER NOT NULL DEFAULT 0 CHECK (streak >= 0);

DROP POLICY IF EXISTS "canvas_users_update_own" ON canvas_users;
CREATE POLICY "canvas_users_update_own"
  ON canvas_users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND happiness_score IS NOT DISTINCT FROM (SELECT happiness_score FROM canvas_users WHERE id = auth.uid())
    AND reward_points   IS NOT DISTINCT FROM (SELECT reward_points   FROM canvas_users WHERE id = auth.uid())
    AND streak          IS NOT DISTINCT FROM (SELECT streak          FROM canvas_users WHERE id = auth.uid())
    AND role            IS NOT DISTINCT FROM (SELECT role            FROM canvas_users WHERE id = auth.uid())
  );
