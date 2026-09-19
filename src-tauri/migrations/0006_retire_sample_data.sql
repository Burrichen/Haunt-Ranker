-- Removes the fictional development dataset from any database that still
-- holds it.
--
-- The sample attractions (Moonlight Manor, Shadowfest and the rest) were
-- scaffolding for building the UI. They must not sit in a real archive
-- alongside genuine Halloween Horror Nights records, where a reader could
-- not tell one from the other — so they are cleared here, once, on the way
-- to the real dataset.
--
-- This deletes only rows flagged `is_sample = 1`. Nothing a user typed about
-- a real attraction is ever flagged that way, so real ratings, notes and
-- rankings are untouched. Ratings of *fictional* attractions do go, by
-- cascade, because the attraction they describe is going.
--
-- `is_sample` itself stays: `npm run db:seed` still creates the fictional
-- dataset for development and tests, and `npm run db:clear` still removes
-- it. Development seeding is a developer tool, not something a shipped
-- build ever does — see `useSampleData`, which only exists in a dev build.

DELETE FROM attractions WHERE is_sample = 1;
DELETE FROM event_years WHERE is_sample = 1;
DELETE FROM sources WHERE is_sample = 1;
