-- Knott's Scary Farm: the canonical maze debut archive, 2021–2026.
--
-- Haunt Ranker's Knott's archive is the mazes that DEBUTED in 2021–2026 —
-- twelve of them — not every maze that ran in those seasons. The research
-- once imported here filed whole yearly lineups, so two older mazes that
-- merely returned in 2024 were stored as if they belonged to this window:
--
--   Wax Works                     debuted 2019
--   Origins: The Curse of Calico  debuted 2019
--
-- They leave the active archive. Anything a person wrote about them — a
-- rating, a note, a ranking position — is copied whole into
-- legacy_personal_data first, exactly as 0014 does for retired categories,
-- so nothing is lost. They are named by id, not chosen by a rule, so a maze
-- someone added by hand is never swept up with them.
--
-- The twelve mazes themselves (names, debut seasons, appearances, wiki) come
-- from data/knotts-archive.json, which an import can add and correct but
-- never delete — removing records is the one thing only a migration does.
--
-- The haunt also records what its archive covers, so the app can say so
-- rather than let a 2021–2026 window read as Knott's whole history.

ALTER TABLE haunts ADD COLUMN archive_coverage TEXT;

UPDATE haunts
SET archive_coverage =
  'The Knott''s archive covers the mazes that debuted from 2021 to 2026. ' ||
  'Older Knott''s history is incomplete and will be added later, so nothing ' ||
  'here is an all-time Knott''s record.'
WHERE id = 'knotts-scary-farm';

CREATE TEMPORARY TABLE retired_attractions AS
SELECT id FROM attractions
WHERE id IN (
  'knotts-scary-farm:2024:maze:wax-works',
  'knotts-scary-farm:2024:maze:origins-the-curse-of-calico'
);

-- 1. Preserve ------------------------------------------------------------------

INSERT OR IGNORE INTO legacy_personal_data (
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
  'outside-knotts-debut-archive'
FROM user_ratings r
JOIN attractions a ON a.id = r.attraction_id
LEFT JOIN event_years e ON e.id = a.event_year_id
WHERE a.id IN (SELECT id FROM retired_attractions);

INSERT OR IGNORE INTO legacy_personal_data (
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
  'outside-knotts-debut-archive'
FROM user_notes n
JOIN attractions a ON a.id = n.attraction_id
LEFT JOIN event_years e ON e.id = a.event_year_id
WHERE a.id IN (SELECT id FROM retired_attractions);

INSERT OR IGNORE INTO legacy_personal_data (
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
  'outside-knotts-debut-archive'
FROM user_rankings k
JOIN attractions a ON a.id = k.attraction_id
LEFT JOIN event_years e ON e.id = a.event_year_id
WHERE a.id IN (SELECT id FROM retired_attractions);

-- 2. Remove --------------------------------------------------------------------
--
-- Deleting the attraction cascades to its parks, appearances, characters,
-- relations, citations, media, venue sections and personal rows (already
-- preserved above). A source only these records cited goes with them.

CREATE TEMPORARY TABLE retired_source_candidates AS
SELECT DISTINCT source_id AS id FROM attraction_sources
WHERE attraction_id IN (SELECT id FROM retired_attractions);

DELETE FROM attractions WHERE id IN (SELECT id FROM retired_attractions);

DELETE FROM sources
WHERE id IN (SELECT id FROM retired_source_candidates)
  AND id NOT IN (SELECT source_id FROM attraction_sources)
  AND id NOT IN (SELECT source_id FROM event_year_sources)
  AND id NOT IN (SELECT source_id FROM media WHERE source_id IS NOT NULL);

DROP TABLE retired_source_candidates;
DROP TABLE retired_attractions;
