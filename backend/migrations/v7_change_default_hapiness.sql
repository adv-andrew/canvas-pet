-- Set starting hapiness to 80 so that it stars as "Ecstatic" but makes them work to keep them at that level and try to reach 100
ALTER TABLE users
ALTER COLUMN happiness_score SET DEFAULT 80;