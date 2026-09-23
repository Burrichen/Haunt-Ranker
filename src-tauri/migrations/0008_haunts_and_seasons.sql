-- Haunt Ranker becomes a two-haunt archive: Halloween Horror Nights and
-- Knott's Scary Farm, neither of them an add-on to the other.
--
-- The shape of the change:
--
--   haunt ──< season ──< attraction
--     │                     │
--     └──< venue >──────────┘   (attraction_parks, now haunt-aware)
--
-- Existing tables keep their names. `event_years` already had exactly the
-- properties a season needs — a stable string id that isn't the year, a
-- calendar year, a display name, dates — so it becomes the season table by
-- gaining a haunt, rather than by being rebuilt under a new name while a
-- user's archive and their backups point at the old one. The domain layer
-- calls them seasons; `parks` are venues. That mapping is written down in
-- README's "Two haunts" section.
--
-- Nothing here touches user_ratings, user_notes or user_rankings.

-- ---------------------------------------------------------------------
-- 1. Haunts.
-- ---------------------------------------------------------------------
CREATE TABLE haunts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT OR IGNORE INTO haunts (id, name, short_name, description) VALUES (
  'hhn',
  'Halloween Horror Nights',
  'HHN',
  'Universal''s Halloween event, running at Universal Orlando and Universal Studios Hollywood.'
);

INSERT OR IGNORE INTO haunts (id, name, short_name, description) VALUES (
  'knotts-scary-farm',
  'Knott''s Scary Farm',
  'Knott''s',
  'The Halloween event at Knott''s Berry Farm in Buena Park, California.'
);

-- ---------------------------------------------------------------------
-- 2. Seasons belong to a haunt.
--
-- SQLite will not add a NOT NULL column that carries a REFERENCES clause,
-- so the column arrives nullable, is backfilled, and the repository is what
-- refuses to write a season without a haunt. Every season that exists today
-- is an HHN season, because that is all the app has held so far.
-- ---------------------------------------------------------------------
ALTER TABLE event_years ADD COLUMN haunt_id TEXT REFERENCES haunts (id);
UPDATE event_years SET haunt_id = 'hhn' WHERE haunt_id IS NULL;

CREATE INDEX idx_event_years_haunt ON event_years (haunt_id);

-- Two haunts can both hold a 2024 season, so the year alone was never
-- identity; this makes that explicit.
CREATE UNIQUE INDEX idx_event_years_haunt_year_name ON event_years (haunt_id, calendar_year, name);

-- ---------------------------------------------------------------------
-- 3. Venues belong to a haunt.
-- ---------------------------------------------------------------------
ALTER TABLE parks ADD COLUMN haunt_id TEXT REFERENCES haunts (id);
UPDATE parks SET haunt_id = 'hhn' WHERE haunt_id IS NULL;

INSERT OR IGNORE INTO parks (id, name, haunt_id)
VALUES ('knotts-berry-farm', 'Knott''s Berry Farm', 'knotts-scary-farm');

-- ---------------------------------------------------------------------
-- 4. Appearances.
--
-- An attraction is canonical and reviewable; the seasons it ran in are a
-- relationship, not a copy of the record. Knott's needs this most — a maze
-- that returns for four years is one rankable attraction with four
-- appearances — but HHN gets it too, so both haunts answer "which seasons
-- did this run in?" the same way.
--
-- Every attraction already belongs to exactly one season, so that becomes
-- its first appearance.
-- ---------------------------------------------------------------------
CREATE TABLE season_appearances (
  attraction_id TEXT NOT NULL REFERENCES attractions (id) ON DELETE CASCADE,
  season_id TEXT NOT NULL REFERENCES event_years (id) ON DELETE CASCADE,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (attraction_id, season_id)
);

INSERT OR IGNORE INTO season_appearances (attraction_id, season_id)
SELECT id, event_year_id FROM attractions;

CREATE INDEX idx_season_appearances_season ON season_appearances (season_id);

-- ---------------------------------------------------------------------
-- 5. Debut year.
--
-- The year this attraction genuinely first ran — which is NOT the earliest
-- year the archive happens to cover. It stays NULL until something reliable
-- says otherwise; an inferred debut would be a fact nobody established.
-- ---------------------------------------------------------------------
ALTER TABLE attractions ADD COLUMN debut_year INTEGER;

-- ---------------------------------------------------------------------
-- 6. Venue-specific wiki sections.
--
-- Merging Hollywood and Orlando into one canonical attraction must not throw
-- away what differed between them. Anything true of one venue and not the
-- other lives here and renders as a subsection of the canonical article —
-- and only when it holds something.
-- ---------------------------------------------------------------------
CREATE TABLE attraction_venue_wiki (
  attraction_id TEXT NOT NULL REFERENCES attractions (id) ON DELETE CASCADE,
  venue_id TEXT NOT NULL REFERENCES parks (id) ON DELETE CASCADE,
  overview TEXT,
  story_lore TEXT,
  experience_description TEXT,
  development_notes TEXT,
  location_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (attraction_id, venue_id)
);

-- A source can speak for one venue's version rather than the whole record.
ALTER TABLE attraction_sources ADD COLUMN venue_id TEXT REFERENCES parks (id);

-- ---------------------------------------------------------------------
-- 7. Migration conflicts.
--
-- 0009 merges same-name cross-park HHN records. Where two records being
-- merged both carry personal data, it must not pick a winner — it records
-- the conflict here and leaves both records alone, so nothing a user wrote
-- is lost or silently overwritten.
-- ---------------------------------------------------------------------
CREATE TABLE migration_conflicts (
  id TEXT PRIMARY KEY,
  migration TEXT NOT NULL,
  kind TEXT NOT NULL,
  subject_id TEXT,
  other_id TEXT,
  detail TEXT NOT NULL,
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- ---------------------------------------------------------------------
-- 8. Relation types for versioned history.
--
-- A deliberately versioned attraction — "Gauntlet (2023)" — and an older
-- record found later should be able to point at each other without being
-- forced into one record. SQLite can't alter a CHECK, so the table is
-- rebuilt; dropping it fires cascades, so its rows are copied aside first
-- and restored afterwards, exactly as 0005 did for sources.
-- ---------------------------------------------------------------------
CREATE TABLE _attraction_relations_backup AS SELECT * FROM attraction_relations;

DROP TABLE attraction_relations;

CREATE TABLE attraction_relations (
  id TEXT PRIMARY KEY,
  attraction_id TEXT NOT NULL REFERENCES attractions (id) ON DELETE CASCADE,
  related_attraction_id TEXT NOT NULL REFERENCES attractions (id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (
    relation_type IN (
      'sequel', 'previous_version', 'same_franchise', 'related_concept',
      'reimagining_of', 'revival_of'
    )
  ),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (attraction_id != related_attraction_id),
  UNIQUE (attraction_id, related_attraction_id, relation_type)
);

INSERT INTO attraction_relations (
  id, attraction_id, related_attraction_id, relation_type, notes, created_at, updated_at
)
SELECT id, attraction_id, related_attraction_id, relation_type, notes, created_at, updated_at
FROM _attraction_relations_backup;

DROP TABLE _attraction_relations_backup;

-- ---------------------------------------------------------------------
-- 9. A haunt can carry its own logo.
--
-- `media` insists an item belongs to exactly one owner, so the owner CHECK
-- has to learn about haunts — which means rebuilding the table. Nothing has
-- a foreign key pointing *at* media, so this one is a straight copy with no
-- cascade to work around.
-- ---------------------------------------------------------------------
CREATE TABLE media_new (
  id TEXT PRIMARY KEY,
  attraction_id TEXT REFERENCES attractions (id) ON DELETE CASCADE,
  event_year_id TEXT REFERENCES event_years (id) ON DELETE CASCADE,
  haunt_id TEXT REFERENCES haunts (id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (
    media_type IN ('poster', 'promotional_image', 'logo', 'event_artwork', 'local_image')
  ),
  url TEXT,
  local_path TEXT,
  source_id TEXT REFERENCES sources (id) ON DELETE SET NULL,
  attribution TEXT,
  license_notes TEXT,
  distribution TEXT NOT NULL DEFAULT 'reference'
    CHECK (distribution IN ('reference', 'local', 'bundled')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (
    (attraction_id IS NOT NULL AND event_year_id IS NULL AND haunt_id IS NULL) OR
    (attraction_id IS NULL AND event_year_id IS NOT NULL AND haunt_id IS NULL) OR
    (attraction_id IS NULL AND event_year_id IS NULL AND haunt_id IS NOT NULL)
  ),
  CHECK (url IS NOT NULL OR local_path IS NOT NULL)
);

INSERT INTO media_new (
  id, attraction_id, event_year_id, media_type, url, local_path, source_id,
  attribution, license_notes, distribution, created_at, updated_at
)
SELECT
  id, attraction_id, event_year_id, media_type, url, local_path, source_id,
  attribution, license_notes, distribution, created_at, updated_at
FROM media;

DROP TABLE media;

ALTER TABLE media_new RENAME TO media;
