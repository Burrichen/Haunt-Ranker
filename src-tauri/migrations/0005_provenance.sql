-- Provenance management.
--
-- Three changes:
--   1. `sources` gains a 'promotional' type. SQLite can't alter a CHECK
--      constraint, so the table has to be rebuilt — see the dance below.
--   2. Sources can now be cited by an event year, not just an attraction
--      (a YouTube recap of a whole event belongs to the year).
--   3. `media` records what we may actually *do* with an image, separately
--      from where it currently lives. The existence of a file or a URL has
--      never been permission to redistribute it.

-- ---------------------------------------------------------------------
-- 1. Rebuild `sources` to widen the type CHECK.
--
-- `DROP TABLE` fires foreign key actions while foreign_keys is on, which
-- would cascade-delete every attraction_sources row and null out every
-- media.source_id. PRAGMA foreign_keys can't be changed from inside a
-- migration's transaction, so the dependents are copied aside and restored
-- afterwards instead. 0005_provenance.test.ts asserts they survive.
-- ---------------------------------------------------------------------
CREATE TABLE _attraction_sources_backup AS SELECT * FROM attraction_sources;
CREATE TABLE _media_source_backup AS SELECT id, source_id FROM media WHERE source_id IS NOT NULL;

CREATE TABLE sources_new (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL CHECK (
    source_type IN (
      'youtube', 'article', 'official_site', 'promotional', 'book',
      'podcast', 'interview', 'social_media', 'other'
    )
  ),
  title TEXT NOT NULL,
  url TEXT,
  publisher TEXT,
  published_at TEXT,
  notes TEXT,
  is_sample INTEGER NOT NULL DEFAULT 0 CHECK (is_sample IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO sources_new (
  id, source_type, title, url, publisher, published_at, notes, is_sample, created_at, updated_at
)
SELECT id, source_type, title, url, publisher, published_at, notes, is_sample, created_at, updated_at
FROM sources;

DROP TABLE sources;
ALTER TABLE sources_new RENAME TO sources;

INSERT OR IGNORE INTO attraction_sources (attraction_id, source_id)
SELECT attraction_id, source_id FROM _attraction_sources_backup;

UPDATE media
SET source_id = (SELECT source_id FROM _media_source_backup WHERE _media_source_backup.id = media.id)
WHERE id IN (SELECT id FROM _media_source_backup);

DROP TABLE _attraction_sources_backup;
DROP TABLE _media_source_backup;

-- ---------------------------------------------------------------------
-- 2. An event year can cite sources of its own.
-- ---------------------------------------------------------------------
CREATE TABLE event_year_sources (
  event_year_id TEXT NOT NULL REFERENCES event_years (id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources (id) ON DELETE CASCADE,
  PRIMARY KEY (event_year_id, source_id)
);

-- ---------------------------------------------------------------------
-- 3. What we may do with a piece of media, recorded deliberately.
--
--   reference — we store a link and nothing else. Never copied, never
--               shipped. The default, because it's the only assumption
--               that's safe without a decision.
--   local     — a file the user chose, copied into the app's own data
--               directory. Theirs, on their machine; never shipped.
--   bundled   — explicitly cleared for distribution with the app. Only
--               ever set deliberately, per asset.
-- ---------------------------------------------------------------------
ALTER TABLE media ADD COLUMN distribution TEXT NOT NULL DEFAULT 'reference'
  CHECK (distribution IN ('reference', 'local', 'bundled'));
