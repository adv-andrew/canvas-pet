-- v2: Add web app user link to canvas_users
-- Run this AFTER schema.sql on existing databases.
-- Fresh installs: apply schema.sql first, then this file.

ALTER TABLE canvas_users
  ADD COLUMN IF NOT EXISTS web_user_id      UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS web_display_name TEXT,
  ADD COLUMN IF NOT EXISTS web_email        TEXT;
