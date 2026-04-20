-- v9: Pinned assignments table
-- Stores which assignments users have pinned in the dashboard.
-- Writes go through the service-role backend only (no INSERT/DELETE RLS policies).

CREATE TABLE IF NOT EXISTS pinned_assignments (
  canvas_user_id  text        NOT NULL,
  institution_url text        NOT NULL,
  assignment_id   integer     NOT NULL,
  pinned_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (canvas_user_id, institution_url, assignment_id),
  FOREIGN KEY (canvas_user_id) REFERENCES canvas_users(canvas_user_id) ON DELETE CASCADE
);

ALTER TABLE pinned_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pinned_assignments_select_own" ON pinned_assignments
  FOR SELECT USING (
    canvas_user_id IN (
      SELECT canvas_user_id FROM canvas_users WHERE id = auth.uid()
    )
  );
