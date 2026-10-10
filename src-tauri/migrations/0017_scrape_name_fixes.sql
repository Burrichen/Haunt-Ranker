-- Names the original HHN scrape broke, and the identity rule re-applied.
--
-- Three records arrived from the scrape damaged:
--
--   hhn-2015-house-          a zero-width space (U+200B) for a name, with the
--                            real title "Insidious" in its location field.
--                            It is HHN 25's Orlando house, in Sprung Tent 2.
--   hhn-2021-house-the-hau   "The Hau", with "nting of Hill House" as its
--                            location: Orlando's 2021 The Haunting of Hill
--                            House — the same name and season as the
--                            Hollywood record, so one attraction (0015's rule).
--   RUN: Blood Sweat and Fears (2015) with a leading zero-width space.
--
-- Each fix only applies while the record still holds the broken value, so a
-- name corrected by hand is never overwritten. Afterwards the canonical
-- identity rule runs again, exactly as in 0015 — which merges the Hill House
-- pair now that their names agree, and, as there, never drops personal data:
-- a clash stops the merge and is recorded in migration_conflicts.
--
-- The dataset (data/hhn-archive.json 2026.10.1) carries the same fixes, with
-- previousIds, so an import afterwards lands on these records.

UPDATE attractions
SET name = 'Insidious', location_notes = 'Sprung Tent 2',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 'hhn-2015-house-'
  AND TRIM(REPLACE(name, char(8203), '')) = '';

UPDATE attractions
SET name = 'The Haunting of Hill House', location_notes = NULL,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 'hhn-2021-house-the-hau'
  AND name = 'The Hau';

-- Zero-width characters render as nothing; no name needs one.
UPDATE attractions
SET name = TRIM(REPLACE(REPLACE(REPLACE(REPLACE(name,
      char(8203), ''), char(8204), ''), char(8205), ''), char(65279), '')),
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE (instr(name, char(8203)) > 0 OR instr(name, char(8204)) > 0
    OR instr(name, char(8205)) > 0 OR instr(name, char(65279)) > 0)
  AND TRIM(REPLACE(REPLACE(REPLACE(REPLACE(name,
      char(8203), ''), char(8204), ''), char(8205), ''), char(65279), '')) <> '';

-- ---------------------------------------------------------------------
-- The canonical identity rule, as in 0015_canonical_identity.sql.
-- ---------------------------------------------------------------------
CREATE TEMPORARY TABLE identity_members AS
SELECT
  a.id AS attraction_id,
  CASE WHEN e.haunt_id = 'hhn' THEN 'hhn' ELSE 'knotts' END AS rule,
  CASE
    WHEN e.haunt_id = 'hhn' THEN 'hhn|' || a.event_year_id || '|'
    ELSE e.haunt_id || '|'
  END || LOWER(TRIM(REPLACE(REPLACE(REPLACE(a.name, '  ', ' '), '  ', ' '), '  ', ' '))) AS group_key,
  e.calendar_year,
  a.event_year_id,
  a.debut_year,
  (SELECT COUNT(*) FROM user_ratings r WHERE r.attraction_id = a.id) AS rating_count,
  (SELECT COUNT(*) FROM user_notes n WHERE n.attraction_id = a.id) AS note_count
FROM attractions a
JOIN event_years e ON e.id = a.event_year_id
WHERE a.attraction_type = 'house'
  AND e.haunt_id IN ('hhn', 'knotts-scary-farm');

DELETE FROM identity_members
WHERE group_key IN (
  SELECT group_key FROM identity_members GROUP BY group_key HAVING COUNT(*) = 1
);

CREATE TEMPORARY TABLE identity_groups AS
SELECT
  m.group_key,
  m.rule,
  (SELECT s.attraction_id FROM identity_members s
    WHERE s.group_key = m.group_key
    ORDER BY CASE WHEN s.rule = 'knotts' THEN s.calendar_year ELSE 0 END, s.attraction_id
    LIMIT 1) AS survivor_id,
  SUM(CASE WHEN m.rating_count > 0 THEN 1 ELSE 0 END) AS rated_records,
  SUM(CASE WHEN m.note_count > 0 THEN 1 ELSE 0 END) AS noted_records,
  COUNT(DISTINCT m.debut_year) AS known_debuts,
  -- A ranking list in which two members of the group both hold a place.
  (SELECT COUNT(*) FROM (
     SELECT k.scope FROM user_rankings k
     JOIN identity_members x ON x.attraction_id = k.attraction_id
     WHERE x.group_key = m.group_key
     GROUP BY k.scope HAVING COUNT(*) > 1)) AS clashing_lists
FROM identity_members m
GROUP BY m.group_key, m.rule;

-- ---------------------------------------------------------------------
-- Groups that are not merged: recorded, then left exactly as they are.
-- ---------------------------------------------------------------------
INSERT OR IGNORE INTO migration_conflicts (id, migration, kind, subject_id, other_id, detail)
SELECT
  'conflict-0017-' || m.attraction_id,
  '0017_scrape_name_fixes',
  CASE WHEN g.rule = 'knotts' AND g.known_debuts > 1
    THEN 'name_reused_different_debut'
    ELSE 'canonical_personal_data' END,
  m.attraction_id,
  g.survivor_id,
  CASE WHEN g.rule = 'knotts' AND g.known_debuts > 1
    THEN 'Not merged: these records share a name but have different debut years, so they ' ||
         'may be different mazes. Both records were left exactly as they are.'
    ELSE 'Not merged: this attraction and the record it would merge into both hold ' ||
         'personal data (ratings on ' || g.rated_records || ' records, notes on ' ||
         g.noted_records || ' records, ' || g.clashing_lists || ' ranking lists holding both). ' ||
         'Both records were left exactly as they are.' END
FROM identity_members m
JOIN identity_groups g ON g.group_key = m.group_key
WHERE m.attraction_id != g.survivor_id
  AND (g.rated_records > 1 OR g.noted_records > 1 OR g.clashing_lists > 0
       OR (g.rule = 'knotts' AND g.known_debuts > 1));

CREATE TEMPORARY TABLE merges AS
SELECT m.attraction_id AS from_id, g.survivor_id AS to_id, g.rule AS rule
FROM identity_members m
JOIN identity_groups g ON g.group_key = m.group_key
WHERE m.attraction_id != g.survivor_id
  AND g.rated_records <= 1
  AND g.noted_records <= 1
  AND g.clashing_lists = 0
  AND NOT (g.rule = 'knotts' AND g.known_debuts > 1);

-- ---------------------------------------------------------------------
-- HHN only: keep what each park's record said about its own build, as a
-- venue section on the canonical record (as 0009 does). A Knott's maze's
-- records are seasons at one venue, not venues, so this doesn't apply.
-- ---------------------------------------------------------------------
INSERT OR IGNORE INTO attraction_venue_wiki (
  attraction_id, venue_id, overview, story_lore, experience_description,
  development_notes, location_notes
)
SELECT mg.to_id, ap.park_id, a.full_overview, a.story_lore, a.experience_description,
       a.development_notes, a.location_notes
FROM merges mg
JOIN attractions a ON a.id = mg.from_id
JOIN attraction_parks ap ON ap.attraction_id = mg.from_id
WHERE mg.rule = 'hhn'
  AND (a.full_overview IS NOT NULL OR a.story_lore IS NOT NULL
    OR a.experience_description IS NOT NULL OR a.development_notes IS NOT NULL
    OR a.location_notes IS NOT NULL);

INSERT OR IGNORE INTO attraction_venue_wiki (
  attraction_id, venue_id, overview, story_lore, experience_description,
  development_notes, location_notes
)
SELECT DISTINCT a.id, ap.park_id, a.full_overview, a.story_lore, a.experience_description,
       a.development_notes, a.location_notes
FROM attractions a
JOIN attraction_parks ap ON ap.attraction_id = a.id
WHERE a.id IN (SELECT to_id FROM merges WHERE rule = 'hhn')
  AND (a.full_overview IS NOT NULL OR a.story_lore IS NOT NULL
    OR a.experience_description IS NOT NULL OR a.development_notes IS NOT NULL
    OR a.location_notes IS NOT NULL);

-- Fill canonical fields the survivor left empty; never overwrite one it has.
-- A known debut year is never replaced, and only ever filled from a record
-- that knew it — never inferred from which season is oldest.
UPDATE attractions
SET
  short_summary = COALESCE(short_summary, (SELECT a.short_summary FROM merges m
    JOIN attractions a ON a.id = m.from_id WHERE m.to_id = attractions.id
    AND a.short_summary IS NOT NULL ORDER BY m.from_id LIMIT 1)),
  full_overview = COALESCE(full_overview, (SELECT a.full_overview FROM merges m
    JOIN attractions a ON a.id = m.from_id WHERE m.to_id = attractions.id
    AND a.full_overview IS NOT NULL ORDER BY m.from_id LIMIT 1)),
  story_lore = COALESCE(story_lore, (SELECT a.story_lore FROM merges m
    JOIN attractions a ON a.id = m.from_id WHERE m.to_id = attractions.id
    AND a.story_lore IS NOT NULL ORDER BY m.from_id LIMIT 1)),
  experience_description = COALESCE(experience_description, (SELECT a.experience_description
    FROM merges m JOIN attractions a ON a.id = m.from_id WHERE m.to_id = attractions.id
    AND a.experience_description IS NOT NULL ORDER BY m.from_id LIMIT 1)),
  development_notes = COALESCE(development_notes, (SELECT a.development_notes FROM merges m
    JOIN attractions a ON a.id = m.from_id WHERE m.to_id = attractions.id
    AND a.development_notes IS NOT NULL ORDER BY m.from_id LIMIT 1)),
  ip_type = COALESCE(ip_type, (SELECT a.ip_type FROM merges m
    JOIN attractions a ON a.id = m.from_id WHERE m.to_id = attractions.id
    AND a.ip_type IS NOT NULL ORDER BY m.from_id LIMIT 1)),
  franchise_name = COALESCE(franchise_name, (SELECT a.franchise_name FROM merges m
    JOIN attractions a ON a.id = m.from_id WHERE m.to_id = attractions.id
    AND a.franchise_name IS NOT NULL ORDER BY m.from_id LIMIT 1)),
  debut_year = COALESCE(debut_year, (SELECT a.debut_year FROM merges m
    JOIN attractions a ON a.id = m.from_id WHERE m.to_id = attractions.id
    AND a.debut_year IS NOT NULL ORDER BY m.from_id LIMIT 1)),
  -- An HHN record merged across parks is no longer one park's version.
  variant_name = CASE
    WHEN id IN (SELECT to_id FROM merges WHERE rule = 'hhn') THEN NULL
    ELSE variant_name END,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id IN (SELECT to_id FROM merges);

-- ---------------------------------------------------------------------
-- Move everything that pointed at the disappearing record.
-- ---------------------------------------------------------------------
INSERT OR IGNORE INTO attraction_parks (attraction_id, park_id)
SELECT m.to_id, ap.park_id FROM merges m JOIN attraction_parks ap ON ap.attraction_id = m.from_id;

-- Every season the disappearing record appeared in is a season the
-- canonical attraction appeared in — this is what makes a returning maze
-- one record. Its own season is added even if no appearance row said so.
INSERT OR IGNORE INTO season_appearances (attraction_id, season_id, notes)
SELECT m.to_id, sa.season_id, sa.notes
FROM merges m JOIN season_appearances sa ON sa.attraction_id = m.from_id;

INSERT OR IGNORE INTO season_appearances (attraction_id, season_id)
SELECT m.to_id, a.event_year_id FROM merges m JOIN attractions a ON a.id = m.from_id;

INSERT OR IGNORE INTO attraction_sources (attraction_id, source_id, venue_id)
SELECT m.to_id, s.source_id, s.venue_id
FROM merges m JOIN attraction_sources s ON s.attraction_id = m.from_id;

UPDATE characters SET attraction_id = (SELECT to_id FROM merges WHERE from_id = characters.attraction_id)
WHERE attraction_id IN (SELECT from_id FROM merges);

UPDATE media SET attraction_id = (SELECT to_id FROM merges WHERE from_id = media.attraction_id)
WHERE attraction_id IN (SELECT from_id FROM merges);

-- Personal data moves whole. A group only reaches this point when at most
-- one record held a rating, at most one a note, and no ranking list held
-- two of them, so nothing collides and nothing is dropped.
UPDATE user_ratings SET attraction_id = (SELECT to_id FROM merges WHERE from_id = user_ratings.attraction_id)
WHERE attraction_id IN (SELECT from_id FROM merges);

UPDATE user_notes SET attraction_id = (SELECT to_id FROM merges WHERE from_id = user_notes.attraction_id)
WHERE attraction_id IN (SELECT from_id FROM merges);

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

DELETE FROM attraction_relations
WHERE attraction_id IN (SELECT from_id FROM merges)
   OR related_attraction_id IN (SELECT from_id FROM merges);

-- ---------------------------------------------------------------------
-- The merged-away records, and the record of what happened.
-- ---------------------------------------------------------------------
INSERT OR IGNORE INTO migration_conflicts (id, migration, kind, subject_id, other_id, detail, resolved_at)
SELECT
  'merged-0017-' || m.from_id,
  '0017_scrape_name_fixes',
  CASE WHEN m.rule = 'hhn' THEN 'cross_park_merged' ELSE 'returning_maze_merged' END,
  m.from_id,
  m.to_id,
  CASE WHEN m.rule = 'hhn'
    THEN 'Merged into the canonical record: same name, same season, same haunt.'
    ELSE 'Merged into the canonical record: the same maze returning in a later season.' END,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM merges m;

DELETE FROM attractions WHERE id IN (SELECT from_id FROM merges);

DROP TABLE merges;
DROP TABLE identity_groups;
DROP TABLE identity_members;
