-- Sub-tasks for assignments created by users to help organize assignments. Give hapiness but not reward points. 
CREATE TABLE IF NOT EXISTS tasks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_user_id uuid      NOT NULL REFERENCES canvas_users(id) ON DELETE CASCADE,
  assignment_id uuid      NOT NULL,
  course_id    uuid      NOT NULL,
  title       text        NOT NULL,
  description text,
  due_date    timestamptz,
  completed   boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);