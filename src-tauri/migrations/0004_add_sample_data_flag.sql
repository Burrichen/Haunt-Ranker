-- Adds an `is_sample` flag so development/sample data (fictional
-- attractions used to build and test the UI) can be marked unambiguously
-- and removed with a handful of DELETE statements before real Halloween
-- Horror Nights data is ever imported. Real imported data must always
-- leave this at its default of 0.
--
-- Only top-level, independently-owned tables need the flag: `characters`,
-- `attraction_parks`, `attraction_relations`, `attraction_sources`,
-- attraction-or-year-owned `media`, and the personal `user_ratings` /
-- `user_notes` / `user_rankings` tables all cascade-delete automatically
-- when their owning `attractions`/`event_years` row is removed (see
-- 0001_archive_schema.sql / 0002_personal_schema.sql). `sources` is the
-- one archive table with no owning FK of its own, so it gets the flag too.

ALTER TABLE event_years ADD COLUMN is_sample INTEGER NOT NULL DEFAULT 0 CHECK (is_sample IN (0, 1));
ALTER TABLE attractions ADD COLUMN is_sample INTEGER NOT NULL DEFAULT 0 CHECK (is_sample IN (0, 1));
ALTER TABLE sources ADD COLUMN is_sample INTEGER NOT NULL DEFAULT 0 CHECK (is_sample IN (0, 1));
