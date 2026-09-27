-- Haunt Packs: a haunt the app has never heard of, added as data.
--
-- Everything that made a haunt something the source code knew about moves
-- into the database here:
--
--   * what a haunt is called, how it describes itself, its accent;
--   * what it calls its attractions — House, Maze, Trail — as rows rather
--     than a lookup table compiled into the app;
--   * which venues it runs at, and what icon stands for each;
--   * where a record came from: which pack, at which version.
--
-- The two haunts that exist today are re-stated as pack-shaped data by this
-- migration, so they travel the same path as anything imported later and
-- nothing about them is special-cased below the UI.
--
-- Nothing here touches user_ratings, user_notes or user_rankings. A pack
-- describes an archive; it has no way to describe a person.

-- ---------------------------------------------------------------------
-- 1. A haunt carries its own presentation and its own provenance.
-- ---------------------------------------------------------------------
ALTER TABLE haunts ADD COLUMN tagline TEXT;
ALTER TABLE haunts ADD COLUMN accent TEXT NOT NULL DEFAULT 'orange';
ALTER TABLE haunts ADD COLUMN venues_label TEXT;
-- Lower sorts first. The home collection leads; packs land after it.
ALTER TABLE haunts ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 100;
ALTER TABLE haunts ADD COLUMN pack_id TEXT;
ALTER TABLE haunts ADD COLUMN pack_version TEXT;
ALTER TABLE haunts ADD COLUMN pack_updated_at TEXT;

UPDATE haunts
SET
  tagline = 'Universal''s Halloween event, at Hollywood and Orlando.',
  accent = 'orange',
  venues_label = 'Hollywood and Orlando',
  sort_order = 0
WHERE id = 'hhn';

UPDATE haunts
SET
  tagline = 'The Halloween event at Knott''s Berry Farm, Buena Park.',
  accent = 'purple',
  venues_label = 'Knott''s Berry Farm',
  sort_order = 10
WHERE id = 'knotts-scary-farm';

-- ---------------------------------------------------------------------
-- 2. What a haunt calls its experiences.
--
-- HHN has Houses, Knott's has Mazes, and a haunt nobody has imported yet
-- may have Trails. The word is the haunt's, so it is stored with the
-- haunt rather than chosen by a `switch` in the interface.
--
-- `category` is what the app reasons about — a walk-through is a
-- walk-through however it is named — and stays a closed set, because the
-- app genuinely behaves differently for each. `label_one`/`label_many`
-- are what a reader sees, and are open.
-- ---------------------------------------------------------------------
CREATE TABLE experience_types (
  id TEXT PRIMARY KEY,
  haunt_id TEXT NOT NULL REFERENCES haunts (id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('walkthrough', 'scare_zone', 'show', 'other')),
  label_one TEXT NOT NULL,
  label_many TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 100,
  pack_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (haunt_id, label_many)
);

CREATE INDEX idx_experience_types_haunt ON experience_types (haunt_id);

INSERT OR IGNORE INTO experience_types (id, haunt_id, category, label_one, label_many, sort_order)
VALUES
  ('hhn:type:house', 'hhn', 'walkthrough', 'House', 'Houses', 0),
  ('hhn:type:scare-zone', 'hhn', 'scare_zone', 'Scare Zone', 'Scare Zones', 10),
  ('knotts-scary-farm:type:maze', 'knotts-scary-farm', 'walkthrough', 'Maze', 'Mazes', 0),
  (
    'knotts-scary-farm:type:scare-zone', 'knotts-scary-farm', 'scare_zone',
    'Scare Zone', 'Scare Zones', 10
  );

-- ---------------------------------------------------------------------
-- 3. Venues are data too.
--
-- A pack brings its own, and says which icon stands for it. The icon is a
-- name from the app's own set rather than an image: a pack can choose
-- between the marks the app already draws, and can't ship artwork.
-- ---------------------------------------------------------------------
ALTER TABLE parks ADD COLUMN icon TEXT;
ALTER TABLE parks ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 100;
ALTER TABLE parks ADD COLUMN pack_id TEXT;

UPDATE parks SET icon = 'star', sort_order = 0 WHERE id = 'hollywood';
UPDATE parks SET icon = 'palm', sort_order = 10 WHERE id = 'orlando';
UPDATE parks SET icon = 'ferris-wheel', sort_order = 20 WHERE id = 'knotts-berry-farm';

-- ---------------------------------------------------------------------
-- 4. Seasons remember which pack described them.
-- ---------------------------------------------------------------------
ALTER TABLE event_years ADD COLUMN pack_id TEXT;
ALTER TABLE event_years ADD COLUMN pack_version TEXT;
ALTER TABLE event_years ADD COLUMN pack_updated_at TEXT;

-- ---------------------------------------------------------------------
-- 5. Attractions: a named experience type, provenance, and room for a
--    kind of experience that is neither a house nor a scare zone.
--
-- The type CHECK has to widen, and SQLite can only widen a CHECK by
-- rebuilding the table. `DROP TABLE` fires foreign key actions, which
-- would cascade into ratings, notes and rankings — so every dependent is
-- copied aside first and restored afterwards, exactly as 0005 and 0008
-- did. 0010_haunt_packs.test.ts asserts the personal rows survive.
-- ---------------------------------------------------------------------
CREATE TABLE _attraction_parks_backup AS SELECT * FROM attraction_parks;
CREATE TABLE _season_appearances_backup AS SELECT * FROM season_appearances;
CREATE TABLE _attraction_venue_wiki_backup AS SELECT * FROM attraction_venue_wiki;
CREATE TABLE _characters_backup AS SELECT * FROM characters;
CREATE TABLE _attraction_relations_backup AS SELECT * FROM attraction_relations;
CREATE TABLE _attraction_sources_backup AS SELECT * FROM attraction_sources;
CREATE TABLE _media_backup AS SELECT * FROM media;
CREATE TABLE _user_ratings_backup AS
  SELECT id, attraction_id, theme, fun, fear, created_at, updated_at FROM user_ratings;
CREATE TABLE _user_notes_backup AS SELECT * FROM user_notes;
CREATE TABLE _user_rankings_backup AS SELECT * FROM user_rankings;

CREATE TABLE attractions_new (
  id TEXT PRIMARY KEY,
  event_year_id TEXT NOT NULL REFERENCES event_years (id) ON DELETE CASCADE,
  -- The category the app reasons about. `house` is the walk-through
  -- category's historical name and is kept so that every stored row, every
  -- backup and every saved ranking scope still reads the same.
  attraction_type TEXT NOT NULL CHECK (
    attraction_type IN ('house', 'scare_zone', 'show', 'other')
  ),
  -- The haunt's own name for this kind of experience, where it named one.
  experience_type_id TEXT REFERENCES experience_types (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  variant_name TEXT,
  ip_type TEXT CHECK (ip_type IS NULL OR ip_type IN ('original', 'licensed')),
  franchise_name TEXT,
  short_summary TEXT,
  full_overview TEXT,
  story_lore TEXT,
  experience_description TEXT,
  development_notes TEXT,
  opening_date TEXT,
  closing_date TEXT,
  location_notes TEXT,
  debut_year INTEGER,
  is_sample INTEGER NOT NULL DEFAULT 0 CHECK (is_sample IN (0, 1)),
  -- Which pack last wrote this record, and when.
  source_pack_id TEXT,
  source_pack_version TEXT,
  pack_updated_at TEXT,
  -- When someone last edited this record by hand. A pack that would change
  -- a record edited since it was last imported raises a conflict instead
  -- of overwriting the edit.
  manual_edit_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (event_year_id, slug)
);

INSERT INTO attractions_new (
  id, event_year_id, attraction_type, name, slug, variant_name, ip_type, franchise_name,
  short_summary, full_overview, story_lore, experience_description, development_notes,
  opening_date, closing_date, location_notes, debut_year, is_sample, created_at, updated_at
)
SELECT
  id, event_year_id, attraction_type, name, slug, variant_name, ip_type, franchise_name,
  short_summary, full_overview, story_lore, experience_description, development_notes,
  opening_date, closing_date, location_notes, debut_year, is_sample, created_at, updated_at
FROM attractions;

DROP TABLE attractions;
ALTER TABLE attractions_new RENAME TO attractions;

CREATE INDEX idx_attractions_event_year ON attractions (event_year_id);
CREATE INDEX idx_attractions_experience_type ON attractions (experience_type_id);

INSERT OR IGNORE INTO attraction_parks (attraction_id, park_id)
SELECT attraction_id, park_id FROM _attraction_parks_backup;

INSERT OR IGNORE INTO season_appearances (attraction_id, season_id, notes, created_at)
SELECT attraction_id, season_id, notes, created_at FROM _season_appearances_backup;

INSERT OR IGNORE INTO attraction_venue_wiki (
  attraction_id, venue_id, overview, story_lore, experience_description,
  development_notes, location_notes, created_at, updated_at
)
SELECT
  attraction_id, venue_id, overview, story_lore, experience_description,
  development_notes, location_notes, created_at, updated_at
FROM _attraction_venue_wiki_backup;

INSERT OR IGNORE INTO characters (id, attraction_id, name, description, created_at, updated_at)
SELECT id, attraction_id, name, description, created_at, updated_at FROM _characters_backup;

INSERT OR IGNORE INTO attraction_relations (
  id, attraction_id, related_attraction_id, relation_type, notes, created_at, updated_at
)
SELECT id, attraction_id, related_attraction_id, relation_type, notes, created_at, updated_at
FROM _attraction_relations_backup;

INSERT OR IGNORE INTO attraction_sources (attraction_id, source_id, venue_id)
SELECT attraction_id, source_id, venue_id FROM _attraction_sources_backup;

DELETE FROM media;
INSERT OR IGNORE INTO media (
  id, attraction_id, event_year_id, haunt_id, media_type, url, local_path, source_id,
  attribution, license_notes, distribution, created_at, updated_at
)
SELECT
  id, attraction_id, event_year_id, haunt_id, media_type, url, local_path, source_id,
  attribution, license_notes, distribution, created_at, updated_at
FROM _media_backup;

INSERT OR IGNORE INTO user_ratings (id, attraction_id, theme, fun, fear, created_at, updated_at)
SELECT id, attraction_id, theme, fun, fear, created_at, updated_at FROM _user_ratings_backup;

INSERT OR IGNORE INTO user_notes (id, attraction_id, note, created_at, updated_at)
SELECT id, attraction_id, note, created_at, updated_at FROM _user_notes_backup;

INSERT OR IGNORE INTO user_rankings (id, scope, attraction_id, position, created_at, updated_at)
SELECT id, scope, attraction_id, position, created_at, updated_at FROM _user_rankings_backup;

DROP TABLE _attraction_parks_backup;
DROP TABLE _season_appearances_backup;
DROP TABLE _attraction_venue_wiki_backup;
DROP TABLE _characters_backup;
DROP TABLE _attraction_relations_backup;
DROP TABLE _attraction_sources_backup;
DROP TABLE _media_backup;
DROP TABLE _user_ratings_backup;
DROP TABLE _user_notes_backup;
DROP TABLE _user_rankings_backup;

-- Existing records point at the type their haunt already used.
UPDATE attractions
SET experience_type_id = (
  SELECT t.id
  FROM experience_types t
  JOIN event_years e ON e.id = attractions.event_year_id
  WHERE t.haunt_id = e.haunt_id
    AND t.category = CASE attractions.attraction_type
      WHEN 'house' THEN 'walkthrough'
      ELSE attractions.attraction_type
    END
)
WHERE experience_type_id IS NULL;

-- ---------------------------------------------------------------------
-- 6. The record of what has been imported.
--
-- One row per pack import, kept so Admin Mode can answer "where did this
-- come from, and when?" without the pack file still being on disk.
-- ---------------------------------------------------------------------
CREATE TABLE haunt_packs (
  id TEXT PRIMARY KEY,
  pack_id TEXT NOT NULL,
  pack_version TEXT NOT NULL,
  schema_id TEXT NOT NULL,
  haunt_id TEXT NOT NULL,
  haunt_name TEXT NOT NULL,
  generated_at TEXT,
  imported_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  -- What the import did, as the preview described it.
  summary TEXT NOT NULL,
  provenance_notes TEXT
);

CREATE INDEX idx_haunt_packs_pack ON haunt_packs (pack_id);
