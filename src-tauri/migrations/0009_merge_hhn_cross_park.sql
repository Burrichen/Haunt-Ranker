-- The HHN Hollywood/Orlando merge.
--
-- Product rule: for Halloween Horror Nights, the same attraction name in the
-- same season at both parks is ONE canonical attraction carrying both venues,
-- one rating, one note and one place in the ranking — however much the two
-- builds differed in layout, facade, scenes or scare actors.
--
-- This migration applies that rule to archive data already imported as
-- separate "Orlando version" / "Hollywood version" records.
--
-- Matching is deliberately literal. Names are compared after trimming,
-- lowercasing and collapsing runs of spaces, and nothing else: no fuzzy
-- matching, no merging on shared franchise or similar titles, and never
-- across seasons. Two records merge only if they are the same haunt, the
-- same season, the same attraction type and the same normalised name.
--
-- Where both records carry personal data, this migration does NOT choose
-- between them. It leaves both records exactly as they are and writes a row
-- to migration_conflicts so the clash can be resolved by a person without
-- anything being lost.

-- ---------------------------------------------------------------------
-- The groups this migration would merge, and which record leads each one.
--
-- The survivor is the lowest id in the group. Ids are stable and assigned
-- once, so the same pair merges into the same record on every machine —
-- which a timestamp could not promise, since two records imported in the
-- same second would then merge one way here and the other way there. The
-- dataset names the same id as canonical, so a later import lands on the
-- record this migration left behind rather than creating a second one.
-- ---------------------------------------------------------------------
CREATE TEMPORARY TABLE merge_groups AS
SELECT
  a.event_year_id AS season_id,
  a.attraction_type AS attraction_type,
  LOWER(
    TRIM(
      REPLACE(REPLACE(REPLACE(a.name, '  ', ' '), '  ', ' '), '  ', ' ')
    )
  ) AS normalised_name,
  MIN(a.id) AS survivor_id,
  COUNT(*) AS record_count
FROM attractions a
JOIN event_years e ON e.id = a.event_year_id
WHERE e.haunt_id = 'hhn'
GROUP BY a.event_year_id, a.attraction_type, normalised_name
HAVING COUNT(*) > 1;

CREATE TEMPORARY TABLE merge_members AS
SELECT
  a.id AS attraction_id,
  g.season_id,
  g.attraction_type,
  g.normalised_name,
  g.survivor_id AS survivor_id,
  (SELECT COUNT(*) FROM user_ratings r WHERE r.attraction_id = a.id) AS rating_count,
  (SELECT COUNT(*) FROM user_notes n WHERE n.attraction_id = a.id) AS note_count
FROM attractions a
JOIN merge_groups g
  ON g.season_id = a.event_year_id
 AND g.attraction_type = a.attraction_type
 AND g.normalised_name = LOWER(
       TRIM(REPLACE(REPLACE(REPLACE(a.name, '  ', ' '), '  ', ' '), '  ', ' '))
     );

-- A group is safe to merge when at most one of its records carries a rating
-- and at most one carries a note. Anything else is a conflict.
CREATE TEMPORARY TABLE merge_safety AS
SELECT
  season_id,
  attraction_type,
  normalised_name,
  survivor_id,
  SUM(CASE WHEN rating_count > 0 THEN 1 ELSE 0 END) AS rated_records,
  SUM(CASE WHEN note_count > 0 THEN 1 ELSE 0 END) AS noted_records
FROM merge_members
GROUP BY season_id, attraction_type, normalised_name, survivor_id;

-- ---------------------------------------------------------------------
-- Conflicts: recorded, and then left alone.
-- ---------------------------------------------------------------------
INSERT INTO migration_conflicts (id, migration, kind, subject_id, other_id, detail)
SELECT
  'conflict-0009-' || m.attraction_id,
  '0009_merge_hhn_cross_park',
  'cross_park_personal_data',
  m.attraction_id,
  s.survivor_id,
  'Not merged: this attraction and the record it would merge into both hold ' ||
  'personal data (ratings on ' || s.rated_records || ' records, notes on ' ||
  s.noted_records || ' records). Both records were left exactly as they are.'
FROM merge_members m
JOIN merge_safety s
  ON s.season_id = m.season_id
 AND s.attraction_type = m.attraction_type
 AND s.normalised_name = m.normalised_name
WHERE (s.rated_records > 1 OR s.noted_records > 1)
  AND m.attraction_id != s.survivor_id;

-- Only groups with no personal-data clash go forward.
CREATE TEMPORARY TABLE merges AS
SELECT m.attraction_id AS from_id, s.survivor_id AS to_id
FROM merge_members m
JOIN merge_safety s
  ON s.season_id = m.season_id
 AND s.attraction_type = m.attraction_type
 AND s.normalised_name = m.normalised_name
WHERE s.rated_records <= 1
  AND s.noted_records <= 1
  AND m.attraction_id != s.survivor_id;

-- ---------------------------------------------------------------------
-- Keep what the disappearing record knew.
--
-- Its venue-specific prose becomes a venue section on the canonical record,
-- so "the Hollywood version had an extra room" survives the merge instead of
-- being flattened into one article that claims it of both parks.
-- ---------------------------------------------------------------------
INSERT OR IGNORE INTO attraction_venue_wiki (
  attraction_id, venue_id, overview, story_lore, experience_description,
  development_notes, location_notes
)
SELECT
  mg.to_id,
  ap.park_id,
  a.full_overview,
  a.story_lore,
  a.experience_description,
  a.development_notes,
  a.location_notes
FROM merges mg
JOIN attractions a ON a.id = mg.from_id
JOIN attraction_parks ap ON ap.attraction_id = mg.from_id
WHERE a.full_overview IS NOT NULL
   OR a.story_lore IS NOT NULL
   OR a.experience_description IS NOT NULL
   OR a.development_notes IS NOT NULL
   OR a.location_notes IS NOT NULL;

-- The survivor's own prose is just as venue-specific, so it is recorded
-- against its own venue before the two records become one.
INSERT OR IGNORE INTO attraction_venue_wiki (
  attraction_id, venue_id, overview, story_lore, experience_description,
  development_notes, location_notes
)
SELECT DISTINCT
  a.id,
  ap.park_id,
  a.full_overview,
  a.story_lore,
  a.experience_description,
  a.development_notes,
  a.location_notes
FROM attractions a
JOIN attraction_parks ap ON ap.attraction_id = a.id
WHERE a.id IN (SELECT to_id FROM merges)
  AND (a.full_overview IS NOT NULL
    OR a.story_lore IS NOT NULL
    OR a.experience_description IS NOT NULL
    OR a.development_notes IS NOT NULL
    OR a.location_notes IS NOT NULL);

-- Fill any canonical field the survivor left empty from the record going
-- away, so the merged article is the fuller of the two rather than the
-- luckier one. Non-empty survivor fields are never overwritten.
UPDATE attractions
SET
  short_summary = COALESCE(
    short_summary,
    (SELECT a.short_summary FROM merges m JOIN attractions a ON a.id = m.from_id
      WHERE m.to_id = attractions.id LIMIT 1)),
  full_overview = COALESCE(
    full_overview,
    (SELECT a.full_overview FROM merges m JOIN attractions a ON a.id = m.from_id
      WHERE m.to_id = attractions.id LIMIT 1)),
  story_lore = COALESCE(
    story_lore,
    (SELECT a.story_lore FROM merges m JOIN attractions a ON a.id = m.from_id
      WHERE m.to_id = attractions.id LIMIT 1)),
  experience_description = COALESCE(
    experience_description,
    (SELECT a.experience_description FROM merges m JOIN attractions a ON a.id = m.from_id
      WHERE m.to_id = attractions.id LIMIT 1)),
  development_notes = COALESCE(
    development_notes,
    (SELECT a.development_notes FROM merges m JOIN attractions a ON a.id = m.from_id
      WHERE m.to_id = attractions.id LIMIT 1)),
  ip_type = COALESCE(
    ip_type,
    (SELECT a.ip_type FROM merges m JOIN attractions a ON a.id = m.from_id
      WHERE m.to_id = attractions.id LIMIT 1)),
  franchise_name = COALESCE(
    franchise_name,
    (SELECT a.franchise_name FROM merges m JOIN attractions a ON a.id = m.from_id
      WHERE m.to_id = attractions.id LIMIT 1)),
  debut_year = COALESCE(
    debut_year,
    (SELECT a.debut_year FROM merges m JOIN attractions a ON a.id = m.from_id
      WHERE m.to_id = attractions.id LIMIT 1)),
  -- The merged record is no longer one park's version of anything.
  variant_name = NULL,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id IN (SELECT to_id FROM merges);

-- ---------------------------------------------------------------------
-- Move everything that pointed at the disappearing record.
-- ---------------------------------------------------------------------
INSERT OR IGNORE INTO attraction_parks (attraction_id, park_id)
SELECT m.to_id, ap.park_id FROM merges m JOIN attraction_parks ap ON ap.attraction_id = m.from_id;

INSERT OR IGNORE INTO season_appearances (attraction_id, season_id)
SELECT m.to_id, sa.season_id FROM merges m JOIN season_appearances sa ON sa.attraction_id = m.from_id;

INSERT OR IGNORE INTO attraction_sources (attraction_id, source_id, venue_id)
SELECT m.to_id, s.source_id, s.venue_id
FROM merges m JOIN attraction_sources s ON s.attraction_id = m.from_id;

UPDATE characters SET attraction_id = (SELECT to_id FROM merges WHERE from_id = characters.attraction_id)
WHERE attraction_id IN (SELECT from_id FROM merges);

UPDATE media SET attraction_id = (SELECT to_id FROM merges WHERE from_id = media.attraction_id)
WHERE attraction_id IN (SELECT from_id FROM merges);

-- Personal data moves rather than being touched: these rows only ever point
-- at the survivor afterwards, and their contents are never read here. A
-- group only reaches this point when at most one record carried each kind,
-- so nothing can collide.
UPDATE user_ratings SET attraction_id = (SELECT to_id FROM merges WHERE from_id = user_ratings.attraction_id)
WHERE attraction_id IN (SELECT from_id FROM merges);

UPDATE user_notes SET attraction_id = (SELECT to_id FROM merges WHERE from_id = user_notes.attraction_id)
WHERE attraction_id IN (SELECT from_id FROM merges);

-- A ranking position could collide inside one scope, so the survivor's own
-- position wins and the duplicate is dropped rather than the two fighting
-- over the UNIQUE (scope, attraction_id).
DELETE FROM user_rankings
WHERE attraction_id IN (SELECT from_id FROM merges)
  AND EXISTS (
    SELECT 1 FROM user_rankings other
    JOIN merges m ON m.from_id = user_rankings.attraction_id
    WHERE other.scope = user_rankings.scope AND other.attraction_id = m.to_id
  );

UPDATE user_rankings SET attraction_id = (SELECT to_id FROM merges WHERE from_id = user_rankings.attraction_id)
WHERE attraction_id IN (SELECT from_id FROM merges);

-- Relations follow, minus any that would now point a record at itself.
DELETE FROM attraction_relations
WHERE (attraction_id IN (SELECT from_id FROM merges) OR related_attraction_id IN (SELECT from_id FROM merges))
  AND COALESCE((SELECT to_id FROM merges WHERE from_id = attraction_id), attraction_id)
      = COALESCE((SELECT to_id FROM merges WHERE from_id = related_attraction_id), related_attraction_id);

UPDATE OR IGNORE attraction_relations
SET attraction_id = COALESCE((SELECT to_id FROM merges WHERE from_id = attraction_id), attraction_id),
    related_attraction_id = COALESCE((SELECT to_id FROM merges WHERE from_id = related_attraction_id), related_attraction_id)
WHERE attraction_id IN (SELECT from_id FROM merges)
   OR related_attraction_id IN (SELECT from_id FROM merges);

-- Anything left pointing at a record about to go (a duplicate relation the
-- UPDATE OR IGNORE skipped) goes with it.
DELETE FROM attraction_relations
WHERE attraction_id IN (SELECT from_id FROM merges)
   OR related_attraction_id IN (SELECT from_id FROM merges);

-- ---------------------------------------------------------------------
-- The merged-away records, and the record of what happened.
-- ---------------------------------------------------------------------
INSERT INTO migration_conflicts (id, migration, kind, subject_id, other_id, detail, resolved_at)
SELECT
  'merged-0009-' || m.from_id,
  '0009_merge_hhn_cross_park',
  'cross_park_merged',
  m.from_id,
  m.to_id,
  'Merged into the canonical record: same name, same season, same haunt, other park.',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM merges m;

DELETE FROM attractions WHERE id IN (SELECT from_id FROM merges);

DROP TABLE merges;
DROP TABLE merge_safety;
DROP TABLE merge_members;
DROP TABLE merge_groups;
