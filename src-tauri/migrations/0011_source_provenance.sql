-- Where a source came from.
--
-- Sources belong to no haunt: two events can cite the same article, and a
-- source outlives the record that first cited it. That is exactly why they
-- need provenance of their own — without it there is no way to tell a
-- citation a pack brought from one a person typed in Admin Mode, and no
-- honest way to withdraw a pack's sources without taking someone else's.
--
-- The four columns mean the same things they mean on `attractions`:
-- which pack last wrote this row, at which version, when — and when a
-- person last edited it here, which is what stops a pack overwriting them.

ALTER TABLE sources ADD COLUMN source_pack_id TEXT;
ALTER TABLE sources ADD COLUMN source_pack_version TEXT;
ALTER TABLE sources ADD COLUMN pack_updated_at TEXT;
ALTER TABLE sources ADD COLUMN manual_edit_at TEXT;

CREATE INDEX idx_sources_pack ON sources (source_pack_id);
