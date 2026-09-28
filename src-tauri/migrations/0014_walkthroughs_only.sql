-- Haunt Ranker archives, rates and ranks walk-throughs only: Houses at
-- Halloween Horror Nights, Mazes at Knott's Scary Farm.
--
-- Scare zones, shows, ride overlays and every other kind of experience
-- leave the product here. Their archive records are removed. Anything the
-- user wrote about them — a rating, a note, a place in a manual ranking —
-- is NOT removed: it is copied, whole, into `legacy_personal_data` first,
-- where it stays out of the interface but survives in the database and in
-- every backup made from it.
--
-- The column CHECKs on `attractions.attraction_type` and
-- `experience_types.category` are deliberately left alone. Rebuilding those
-- tables would rewire every foreign key on a live user database for no gain;
-- the app simply no longer creates the retired values, and backups and
-- dataset imports refuse or divert them before they reach a table.
--
-- Walk-through records, and every rating, note and ranking on them, are
-- untouched.

CREATE TABLE legacy_personal_data (
  -- `<kind>:<original row id>`, so a preserved rating and a preserved note
  -- can never collide.
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('rating', 'note', 'ranking')),
  -- The original row's id in user_ratings / user_notes / user_rankings.
  original_id TEXT NOT NULL,
  -- Not a foreign key: the attraction it described is gone. What it was is
  -- written down beside it so the row still means something on its own.
  attraction_id TEXT NOT NULL,
  attraction_name TEXT,
  attraction_type TEXT,
  haunt_id TEXT,
  season_id TEXT,
  calendar_year INTEGER,
  -- The original row, every column, as JSON.
  payload TEXT NOT NULL,
  reason TEXT NOT NULL,
  preserved_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_legacy_personal_data_attraction ON legacy_personal_data (attraction_id);

-- 1. Preserve -----------------------------------------------------------------

INSERT INTO legacy_personal_data (
  id, kind, original_id, attraction_id, attraction_name, attraction_type,
  haunt_id, season_id, calendar_year, payload, reason
)
SELECT
  'rating:' || r.id, 'rating', r.id, a.id, a.name, a.attraction_type,
  e.haunt_id, e.id, e.calendar_year,
  json_object(
    'id', r.id, 'attraction_id', r.attraction_id,
    'theme', r.theme, 'fun', r.fun, 'fear', r.fear,
    'created_at', r.created_at, 'updated_at', r.updated_at
  ),
  'retired-category'
FROM user_ratings r
JOIN attractions a ON a.id = r.attraction_id
LEFT JOIN event_years e ON e.id = a.event_year_id
WHERE a.attraction_type <> 'house';

INSERT INTO legacy_personal_data (
  id, kind, original_id, attraction_id, attraction_name, attraction_type,
  haunt_id, season_id, calendar_year, payload, reason
)
SELECT
  'note:' || n.id, 'note', n.id, a.id, a.name, a.attraction_type,
  e.haunt_id, e.id, e.calendar_year,
  json_object(
    'id', n.id, 'attraction_id', n.attraction_id, 'note', n.note,
    'created_at', n.created_at, 'updated_at', n.updated_at
  ),
  'retired-category'
FROM user_notes n
JOIN attractions a ON a.id = n.attraction_id
LEFT JOIN event_years e ON e.id = a.event_year_id
WHERE a.attraction_type <> 'house';

INSERT INTO legacy_personal_data (
  id, kind, original_id, attraction_id, attraction_name, attraction_type,
  haunt_id, season_id, calendar_year, payload, reason
)
SELECT
  'ranking:' || k.id, 'ranking', k.id, a.id, a.name, a.attraction_type,
  e.haunt_id, e.id, e.calendar_year,
  json_object(
    'id', k.id, 'scope', k.scope, 'attraction_id', k.attraction_id,
    'position', k.position, 'created_at', k.created_at, 'updated_at', k.updated_at
  ),
  'retired-category'
FROM user_rankings k
JOIN attractions a ON a.id = k.attraction_id
LEFT JOIN event_years e ON e.id = a.event_year_id
WHERE a.attraction_type <> 'house';

-- 2. Keep a hand-made "All Attractions" order ------------------------------
--
-- The All Attractions list (`attractions:all`, `hhn:attractions:all`, ...)
-- mixed houses and zones, and the Rankings page no longer offers it. Where
-- the matching walk-through list (`houses:all`, ...) has never been made,
-- the All Attractions order is copied into it — walk-throughs only, in the
-- same order, positions made dense again. An existing walk-through list is
-- the person's own decision and is never overwritten. The All Attractions
-- rows themselves stay where they are.

CREATE TEMPORARY TABLE walkthrough_ranking_copies AS
SELECT
  'walkthrough:' || r.id AS id,
  substr(r.scope, 1, length(r.scope) - length('attractions:all')) || 'houses:all' AS scope,
  r.attraction_id AS attraction_id,
  ROW_NUMBER() OVER (PARTITION BY r.scope ORDER BY r.position, r.id) - 1 AS position,
  r.created_at AS created_at,
  r.updated_at AS updated_at
FROM user_rankings r
JOIN attractions a ON a.id = r.attraction_id
WHERE (r.scope = 'attractions:all' OR r.scope LIKE '%:attractions:all')
  AND a.attraction_type = 'house'
  AND NOT EXISTS (
    SELECT 1 FROM user_rankings h
    WHERE h.scope = substr(r.scope, 1, length(r.scope) - length('attractions:all')) || 'houses:all'
  );

INSERT INTO user_rankings (id, scope, attraction_id, position, created_at, updated_at)
SELECT id, scope, attraction_id, position, created_at, updated_at FROM walkthrough_ranking_copies;

DROP TABLE walkthrough_ranking_copies;

-- 3. Remove the retired records ---------------------------------------------
--
-- Every child row is deleted explicitly rather than left to ON DELETE
-- CASCADE, so the outcome doesn't depend on whether this connection has
-- foreign keys switched on.

CREATE TEMPORARY TABLE retired_attractions AS
SELECT id FROM attractions WHERE attraction_type <> 'house';

-- Sources only these records cited. Worked out before anything is deleted;
-- a source still cited by a walk-through, a season or a media record stays.
CREATE TEMPORARY TABLE retired_source_candidates AS
SELECT DISTINCT source_id AS id FROM attraction_sources
WHERE attraction_id IN (SELECT id FROM retired_attractions);

DELETE FROM user_ratings WHERE attraction_id IN (SELECT id FROM retired_attractions);
DELETE FROM user_notes WHERE attraction_id IN (SELECT id FROM retired_attractions);
DELETE FROM user_rankings WHERE attraction_id IN (SELECT id FROM retired_attractions);

DELETE FROM attraction_parks WHERE attraction_id IN (SELECT id FROM retired_attractions);
DELETE FROM season_appearances WHERE attraction_id IN (SELECT id FROM retired_attractions);
DELETE FROM attraction_venue_wiki WHERE attraction_id IN (SELECT id FROM retired_attractions);
DELETE FROM characters WHERE attraction_id IN (SELECT id FROM retired_attractions);
DELETE FROM attraction_sources WHERE attraction_id IN (SELECT id FROM retired_attractions);
DELETE FROM media WHERE attraction_id IN (SELECT id FROM retired_attractions);
DELETE FROM attraction_relations
WHERE attraction_id IN (SELECT id FROM retired_attractions)
   OR related_attraction_id IN (SELECT id FROM retired_attractions);

DELETE FROM attractions WHERE id IN (SELECT id FROM retired_attractions);

DELETE FROM sources
WHERE id IN (SELECT id FROM retired_source_candidates)
  AND id NOT IN (SELECT source_id FROM attraction_sources)
  AND id NOT IN (SELECT source_id FROM event_year_sources)
  AND id NOT IN (SELECT source_id FROM media WHERE source_id IS NOT NULL);

-- The vocabulary for the retired categories ("Scare Zone", "Show", ...).
-- Nothing points at it any more.
DELETE FROM experience_types WHERE category <> 'walkthrough';

DROP TABLE retired_source_candidates;
DROP TABLE retired_attractions;
