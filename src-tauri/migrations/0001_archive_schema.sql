-- Archive data: facts about Halloween Horror Nights attractions.
--
-- This schema is versioned independently of personal data
-- (0002_personal_schema.sql) so archive facts can be corrected, expanded or
-- re-imported later without ever touching a user's own ratings, notes or
-- rankings. Most descriptive columns are nullable — a fact that isn't
-- known yet is NULL, never a placeholder value.

CREATE TABLE event_years (
  id TEXT PRIMARY KEY,
  calendar_year INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  source_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (calendar_year, name)
);

-- Fixed, small lookup table (Hollywood / Orlando) — seeded in
-- 0003_seed_reference_data.sql, not user-editable.
CREATE TABLE parks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE attractions (
  id TEXT PRIMARY KEY,
  event_year_id TEXT NOT NULL REFERENCES event_years (id) ON DELETE CASCADE,
  attraction_type TEXT NOT NULL CHECK (attraction_type IN ('house', 'scare_zone')),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  -- Optional alternate/regional cut of the same attraction, e.g. a
  -- "Uncensored" or park-specific variant.
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
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (event_year_id, slug)
);

CREATE INDEX idx_attractions_event_year ON attractions (event_year_id);

-- An attraction can belong to Hollywood only, Orlando only, or both — a
-- proper many-to-many relationship rather than a single string field.
CREATE TABLE attraction_parks (
  attraction_id TEXT NOT NULL REFERENCES attractions (id) ON DELETE CASCADE,
  park_id TEXT NOT NULL REFERENCES parks (id) ON DELETE CASCADE,
  PRIMARY KEY (attraction_id, park_id)
);

-- Zero or more notable named characters/creatures per attraction.
CREATE TABLE characters (
  id TEXT PRIMARY KEY,
  attraction_id TEXT NOT NULL REFERENCES attractions (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_characters_attraction ON characters (attraction_id);

-- Relationships between attractions. Kept to a small, fixed set of types —
-- not an open-ended relationship graph.
CREATE TABLE attraction_relations (
  id TEXT PRIMARY KEY,
  attraction_id TEXT NOT NULL REFERENCES attractions (id) ON DELETE CASCADE,
  related_attraction_id TEXT NOT NULL REFERENCES attractions (id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (
    relation_type IN ('sequel', 'previous_version', 'same_franchise', 'related_concept')
  ),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (attraction_id != related_attraction_id),
  UNIQUE (attraction_id, related_attraction_id, relation_type)
);

CREATE INDEX idx_attraction_relations_attraction ON attraction_relations (attraction_id);

-- Every factual claim should eventually be sourceable. A source can be
-- cited by more than one attraction (e.g. a single article covering a
-- whole event year), so the link is a many-to-many join table below.
CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL CHECK (
    source_type IN (
      'youtube', 'article', 'official_site', 'book', 'podcast',
      'interview', 'social_media', 'other'
    )
  ),
  title TEXT NOT NULL,
  url TEXT,
  publisher TEXT,
  published_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE attraction_sources (
  attraction_id TEXT NOT NULL REFERENCES attractions (id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources (id) ON DELETE CASCADE,
  PRIMARY KEY (attraction_id, source_id)
);

-- Media metadata (poster, promo image, logo, event artwork, local image)
-- belongs to exactly one attraction OR one event year, never both. It
-- always tracks where it came from, and a license/attribution note is a
-- first-class column: the mere existence of an image online is never
-- sufficient license to bundle it.
CREATE TABLE media (
  id TEXT PRIMARY KEY,
  attraction_id TEXT REFERENCES attractions (id) ON DELETE CASCADE,
  event_year_id TEXT REFERENCES event_years (id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (
    media_type IN ('poster', 'promotional_image', 'logo', 'event_artwork', 'local_image')
  ),
  url TEXT,
  local_path TEXT,
  source_id TEXT REFERENCES sources (id) ON DELETE SET NULL,
  attribution TEXT,
  license_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (
    (attraction_id IS NOT NULL AND event_year_id IS NULL) OR
    (attraction_id IS NULL AND event_year_id IS NOT NULL)
  ),
  CHECK (url IS NOT NULL OR local_path IS NOT NULL)
);

CREATE INDEX idx_media_attraction ON media (attraction_id);
CREATE INDEX idx_media_event_year ON media (event_year_id);
