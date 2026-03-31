-- v6: Create shop_items and user_items tables
-- Run this on an existing Supabase project that already has the schema.sql base applied.
-- For a fresh project, schema.sql already includes these tables.

CREATE TABLE IF NOT EXISTS shop_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT,
  cost        INTEGER     NOT NULL CHECK (cost >= 0),
  image_url   TEXT,
  active      BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_items (
  user_id     UUID        NOT NULL REFERENCES canvas_users(id) ON DELETE CASCADE,
  item_id     UUID        NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);

ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop_items_select_all" ON shop_items
  FOR SELECT USING (true);

CREATE POLICY "user_items_select_own" ON user_items
  FOR SELECT USING (user_id IN (SELECT id FROM canvas_users WHERE id = auth.uid()));

-- No INSERT policy on user_items. All purchases go through the backend
-- service-role client after verifying point balance.
