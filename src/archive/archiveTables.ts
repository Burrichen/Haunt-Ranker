import type { BackupTableKey } from "../models/backup";

/**
 * The line an archive import must never cross, written down in code rather
 * than only in prose.
 *
 * Everything in `ARCHIVE_TABLE_KEYS` describes the event: facts about houses,
 * scare zones, years, sources and media, which a dataset update is allowed to
 * add to and correct. Everything in `PERSONAL_TABLE_KEYS` is the user's own —
 * what they thought of an attraction, what they wrote about it, and the order
 * they put them in — and no import writes to those tables at all.
 *
 * The one exception, which exists so that personal data *survives* an archive
 * correction rather than in spite of it: when a dataset declares that an
 * attraction's id has changed (`previousIds`), rows in the personal tables are
 * repointed at the new id. Their contents are never read, changed or deleted.
 */
export const ARCHIVE_TABLE_KEYS = [
  "eventYears",
  "attractions",
  "attractionParks",
  "characters",
  "attractionRelations",
  "sources",
  "attractionSources",
  "eventYearSources",
  "media",
] as const satisfies readonly BackupTableKey[];

export const PERSONAL_TABLE_KEYS = [
  "ratings",
  "notes",
  "rankings",
  "settings",
] as const satisfies readonly BackupTableKey[];

export type ArchiveTableKey = (typeof ARCHIVE_TABLE_KEYS)[number];
export type PersonalTableKey = (typeof PERSONAL_TABLE_KEYS)[number];

/**
 * Fails to compile if a table is ever added without deciding which side of the
 * line it falls on. A new table is exactly the moment that decision is easiest
 * to forget and most expensive to get wrong.
 */
type Unclassified = Exclude<BackupTableKey, ArchiveTableKey | PersonalTableKey>;
export type EveryTableIsClassified = Unclassified extends never ? true : Unclassified;

/** The tables holding rows that belong to one attraction, keyed by that column. */
export const ATTRACTION_OWNED_TABLES = [
  "attraction_parks",
  "characters",
  "attraction_sources",
  "media",
  "user_ratings",
  "user_notes",
  "user_rankings",
] as const;

/** The tables holding rows that belong to one event year. */
export const EVENT_YEAR_OWNED_TABLES = ["attractions", "event_year_sources", "media"] as const;
