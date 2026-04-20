-- v8: Privacy consent tracking + enforce minimal storage policy (FERPA)
--
-- Minimal storage principle:
--   saved_assignments stores only the identifiers and metadata needed to
--   operate the app (assignment_id, course_id, plannable_type, title, due_date,
--   completed_at). Grades, submission content, and submission status flags
--   (late, missing, needs_grading) are never persisted.
--
-- privacy_consent_at records the timestamp at which the user accepted the
--   Privacy Policy. NULL means the user predates the consent requirement or
--   has not yet consented (web sign-up flow records this via Supabase user
--   metadata and a future backend sync; extension users consent on first use).

ALTER TABLE canvas_users
  ADD COLUMN IF NOT EXISTS privacy_consent_at TIMESTAMPTZ;

COMMENT ON COLUMN canvas_users.privacy_consent_at IS
  'Timestamp when the user accepted the Privacy Policy. '
  'NULL for accounts created before v8 or pending consent. '
  'Set by the backend on sign-up or first Canvas link.';

-- Tighten the saved_assignments RLS: block inserts for users who have not
-- yet recorded consent. Existing rows are unaffected (UPDATE/DELETE unchanged).
-- Note: extension users go through canvas-signin which sets consent on link;
--       web users set it during email sign-up.

DROP POLICY IF EXISTS "saved_assignments_insert_own" ON saved_assignments;
CREATE POLICY "saved_assignments_insert_own" ON saved_assignments
  FOR INSERT
  WITH CHECK (
    canvas_user_id = (
      SELECT canvas_user_id
      FROM canvas_users
      WHERE id = auth.uid()
        AND privacy_consent_at IS NOT NULL
    )
  );

-- Ensure the title column has a comment clarifying its FERPA scope.
COMMENT ON COLUMN saved_assignments.title IS
  'Assignment title cached from Canvas at save time. '
  'Stored with user consent per the Privacy Policy. '
  'Not a grade or submission record — covered by FERPA minimal storage policy.';

COMMENT ON COLUMN saved_assignments.due_date IS
  'Assignment due date cached from Canvas at save time. '
  'Used to compute reward point tiers. Not a grade or submission record.';
