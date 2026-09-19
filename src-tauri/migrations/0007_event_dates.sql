-- Event years gain their own run dates.
--
-- An attraction already records when it opened and closed; the *event* did
-- not, and "which nights did this season actually run" is a fact the archive
-- has to be able to hold — the import format requires it ("event dates where
-- known").
--
-- Both are nullable and stay nullable: an archive is built from partial
-- knowledge, and a season whose dates nobody has written down is still worth
-- recording. Stored as ISO-8601 date strings (YYYY-MM-DD), like every other
-- date in the schema, so they sort and compare as text.

ALTER TABLE event_years ADD COLUMN starts_on TEXT;
ALTER TABLE event_years ADD COLUMN ends_on TEXT;
