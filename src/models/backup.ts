import type { ParkId } from "./park";

/**
 * The backup file format's own version, independent of the app version and
 * of the database schema version. It changes only when the *shape of the
 * file* changes, so an older backup can be recognised and upgraded rather
 * than guessed at (see `src/backup/backupFormat.ts`).
 *
 * Adding a *nullable* column doesn't change it: an older file simply has no
 * value for that column, which the reader already treats as null, and a
 * newer file's extra column is dropped by an older reader. The version moves
 * when an older file can no longer be read correctly — a renamed or removed
 * column, a changed meaning, a new required field.
 */
export const BACKUP_FORMAT_VERSION = 1;

/**
 * A backup is a table-level dump rather than a dump of the domain models.
 *
 * That's deliberate: the join tables (`attraction_parks`,
 * `attraction_sources`, `event_year_sources`) carry relationships no single
 * domain model exposes, and a restore that loses them would quietly change
 * the archive. Column names therefore match the database exactly, so what
 * comes out is what goes back in.
 *
 * `parks` is the one table not included: it's fixed reference data seeded by
 * a migration, never user-editable, and an import has no business replacing
 * it.
 */
export interface EventYearRow {
  id: string;
  calendar_year: number;
  name: string;
  description: string | null;
  source_notes: string | null;
  starts_on: string | null;
  ends_on: string | null;
  is_sample: number;
  created_at: string;
  updated_at: string;
}

export interface AttractionRow {
  id: string;
  event_year_id: string;
  attraction_type: string;
  name: string;
  slug: string;
  variant_name: string | null;
  ip_type: string | null;
  franchise_name: string | null;
  short_summary: string | null;
  full_overview: string | null;
  story_lore: string | null;
  experience_description: string | null;
  development_notes: string | null;
  opening_date: string | null;
  closing_date: string | null;
  location_notes: string | null;
  is_sample: number;
  created_at: string;
  updated_at: string;
}

export interface AttractionParkRow {
  attraction_id: string;
  park_id: ParkId;
}

export interface CharacterRow {
  id: string;
  attraction_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttractionRelationRow {
  id: string;
  attraction_id: string;
  related_attraction_id: string;
  relation_type: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SourceRow {
  id: string;
  source_type: string;
  title: string;
  url: string | null;
  publisher: string | null;
  published_at: string | null;
  notes: string | null;
  is_sample: number;
  created_at: string;
  updated_at: string;
}

export interface AttractionSourceRow {
  attraction_id: string;
  source_id: string;
}

export interface EventYearSourceRow {
  event_year_id: string;
  source_id: string;
}

export interface MediaRow {
  id: string;
  attraction_id: string | null;
  event_year_id: string | null;
  media_type: string;
  url: string | null;
  local_path: string | null;
  source_id: string | null;
  attribution: string | null;
  license_notes: string | null;
  distribution: string;
  created_at: string;
  updated_at: string;
}

/** `total` is a generated column — never exported, never imported, always recomputed. */
export interface RatingRow {
  id: string;
  attraction_id: string;
  theme: number;
  fun: number;
  fear: number;
  created_at: string;
  updated_at: string;
}

export interface NoteRow {
  id: string;
  attraction_id: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface RankingRow {
  id: string;
  scope: string;
  attraction_id: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface SettingRow {
  key: string;
  value: string;
  updated_at: string;
}

/** Every table a backup carries, in an order that satisfies foreign keys. */
export interface BackupData {
  eventYears: EventYearRow[];
  attractions: AttractionRow[];
  attractionParks: AttractionParkRow[];
  characters: CharacterRow[];
  attractionRelations: AttractionRelationRow[];
  sources: SourceRow[];
  attractionSources: AttractionSourceRow[];
  eventYearSources: EventYearSourceRow[];
  media: MediaRow[];
  ratings: RatingRow[];
  notes: NoteRow[];
  rankings: RankingRow[];
  settings: SettingRow[];
}

export type BackupTableKey = keyof BackupData;

/**
 * Preferences worth carrying to another machine.
 *
 * Admin Mode is deliberately absent: it's a safety default, not a taste, and
 * a restore should never switch editing on for someone who hasn't asked for
 * it on this machine.
 */
export interface BackupPreferences {
  ambientEffects?: boolean;
  motion?: string;
  attractionViewMode?: string;
}

export interface BackupFile {
  /** The format's version, so a future reader knows what it's looking at. */
  formatVersion: number;
  /** Which build of Haunt Ranker wrote it — context for a human reading the file. */
  appVersion: string;
  /** The database schema version at export time. */
  schemaVersion: number;
  /** ISO 8601, UTC. */
  exportedAt: string;
  data: BackupData;
  preferences: BackupPreferences;
}
