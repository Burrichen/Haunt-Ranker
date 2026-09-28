-- Give HHN its own copy of the manual rankings saved before there was a
-- second haunt.
--
-- Before 0008 the only haunt was HHN, so the lists saved under
-- `houses:all`, `scare_zones:all` and `attractions:all` were HHN's lists.
-- Since then those unprefixed keys belong to All Haunts, and HHN's own
-- lists live under `hhn:houses:all` and so on — which nothing ever wrote
-- for an existing install. Viewing HHN, a person's hand-made order read as
-- if they had never made one.
--
-- So each unprefixed list is copied to HHN's key, keeping only HHN
-- attractions and their order, with positions made dense again (0009 can
-- leave gaps where it dropped a merged-away duplicate). The unprefixed list
-- is left exactly as it is: it is still the All Haunts list.
--
-- Only where HHN has no list of its own yet. A list made since, on the HHN
-- view, is the person's newer decision and is never overwritten.
--
-- Nothing here touches ratings or notes.

CREATE TEMPORARY TABLE hhn_ranking_copies AS
SELECT
  'hhn:' || r.id AS id,
  'hhn:' || r.scope AS scope,
  r.attraction_id AS attraction_id,
  ROW_NUMBER() OVER (PARTITION BY r.scope ORDER BY r.position, r.id) - 1 AS position,
  r.created_at AS created_at,
  r.updated_at AS updated_at
FROM user_rankings r
JOIN attractions a ON a.id = r.attraction_id
JOIN event_years e ON e.id = a.event_year_id
WHERE r.scope IN ('houses:all', 'scare_zones:all', 'attractions:all')
  AND e.haunt_id = 'hhn'
  AND NOT EXISTS (SELECT 1 FROM user_rankings h WHERE h.scope = 'hhn:' || r.scope);

INSERT INTO user_rankings (id, scope, attraction_id, position, created_at, updated_at)
SELECT id, scope, attraction_id, position, created_at, updated_at FROM hhn_ranking_copies;

DROP TABLE hhn_ranking_copies;
