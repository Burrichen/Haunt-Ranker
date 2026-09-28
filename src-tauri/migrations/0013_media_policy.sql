-- What the archive may do with an image, stated in the four terms a person
-- actually decides in — and a place for event maps.
--
-- `distribution` gains `unclear`. Until now a picture whose reuse rights
-- nobody had established could only be filed as `reference`, which reads as
-- "we know where the original is and it's fine to point at". `unclear` says
-- what is actually true: it exists, it's recorded with its provenance, and
-- nobody has decided anything about it. The four are:
--
--   bundled    approved: deliberately cleared, one asset at a time
--   local      user-provided: a file someone added on their own machine
--   reference  external reference only: where the original lives
--   unclear    redistribution unclear: recorded for a person to decide
--
-- `media_type` gains `map`, so an official event map can be recorded as what
-- it is and is never picked as a card's artwork.
--
-- SQLite can't widen a CHECK, so the table is rebuilt. Nothing has a foreign
-- key pointing at media, so this is a straight copy, as in 0008.

CREATE TABLE media_new (
  id TEXT PRIMARY KEY,
  attraction_id TEXT REFERENCES attractions (id) ON DELETE CASCADE,
  event_year_id TEXT REFERENCES event_years (id) ON DELETE CASCADE,
  haunt_id TEXT REFERENCES haunts (id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (
    media_type IN ('poster', 'promotional_image', 'logo', 'event_artwork', 'map', 'local_image')
  ),
  url TEXT,
  local_path TEXT,
  source_id TEXT REFERENCES sources (id) ON DELETE SET NULL,
  attribution TEXT,
  license_notes TEXT,
  distribution TEXT NOT NULL DEFAULT 'reference'
    CHECK (distribution IN ('reference', 'unclear', 'local', 'bundled')),
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
  id, attraction_id, event_year_id, haunt_id, media_type, url, local_path, source_id,
  attribution, license_notes, distribution, created_at, updated_at
)
SELECT
  id, attraction_id, event_year_id, haunt_id, media_type, url, local_path, source_id,
  attribution, license_notes, distribution, created_at, updated_at
FROM media;

DROP TABLE media;

ALTER TABLE media_new RENAME TO media;

-- 0008's rebuild dropped these along with the old table and never put them
-- back; every page that shows artwork looks media up by its owner.
CREATE INDEX idx_media_attraction ON media (attraction_id);
CREATE INDEX idx_media_event_year ON media (event_year_id);
