import type { BackupTableKey } from "../models/backup";
import { PARK_IDS } from "../models/park";
import { isValidRatingValue } from "../models/rating";

/**
 * One description of every backed-up table, shared by the validator and the
 * SQL that reads and writes them.
 *
 * Sharing it is the point: a column added to the export but forgotten in the
 * validator (or vice versa) is exactly the bug that makes a restore quietly
 * lossy, and there's no second list here to forget.
 */
export type BackupColumnKind = "text" | "int" | "real" | "flag";

export interface BackupColumn {
  kind: BackupColumnKind;
  /** May be `null` in the file and in the database. */
  nullable?: boolean;
  /** The only accepted values, for the small fixed enumerations. */
  values?: readonly string[];
  /** A further constraint on a numeric column, mirroring the database's CHECK. */
  check?: (value: number) => boolean;
  /** This column holds the `id` of a row in another backed-up table. */
  references?: BackupTableKey;
}

export interface BackupTableSpec {
  key: BackupTableKey;
  /** The real table name. */
  table: string;
  /** Human wording for the import preview. */
  label: string;
  columns: Record<string, BackupColumn>;
  /** Deterministic export order, so two exports of the same data are identical. */
  orderBy: string;
  /**
   * Reference data: carried in a backup so the file explains itself and so
   * its ids can be checked, but never deleted by an import. A migration
   * seeds these rows and everything else points at them; an import that
   * emptied them — because some older or hand-edited file happened not to
   * list them — would leave an app with no haunts at all.
   */
  reference?: boolean;
  /** A constraint spanning more than one column. Returns a problem, or null. */
  rowCheck?: (row: Record<string, unknown>) => string | null;
}

const TIMESTAMPS: Record<string, BackupColumn> = {
  created_at: { kind: "text" },
  updated_at: { kind: "text" },
};

const PARK_ID_VALUES = Object.values(PARK_IDS);

/**
 * Foreign-key-safe order: every table comes after the tables it points at.
 * The import inserts in this order and deletes in reverse, so neither
 * direction ever trips a foreign key.
 */
export const BACKUP_TABLES: readonly BackupTableSpec[] = [
  {
    key: "haunts",
    table: "haunts",
    label: "Haunts",
    orderBy: "id",
    reference: true,
    columns: {
      id: { kind: "text" },
      name: { kind: "text" },
      short_name: { kind: "text" },
      description: { kind: "text", nullable: true },
      ...TIMESTAMPS,
    },
  },
  {
    key: "venues",
    table: "parks",
    label: "Venues",
    orderBy: "id",
    reference: true,
    columns: {
      id: { kind: "text" },
      name: { kind: "text" },
      haunt_id: { kind: "text", references: "haunts" },
    },
  },
  {
    key: "eventYears",
    table: "event_years",
    label: "Seasons",
    orderBy: "id",
    columns: {
      id: { kind: "text" },
      haunt_id: { kind: "text", references: "haunts" },
      calendar_year: { kind: "int" },
      name: { kind: "text" },
      description: { kind: "text", nullable: true },
      source_notes: { kind: "text", nullable: true },
      starts_on: { kind: "text", nullable: true },
      ends_on: { kind: "text", nullable: true },
      is_sample: { kind: "flag" },
      ...TIMESTAMPS,
    },
  },
  {
    key: "attractions",
    table: "attractions",
    label: "Attractions",
    orderBy: "id",
    columns: {
      id: { kind: "text" },
      event_year_id: { kind: "text", references: "eventYears" },
      attraction_type: { kind: "text", values: ["house", "scare_zone"] },
      name: { kind: "text" },
      slug: { kind: "text" },
      variant_name: { kind: "text", nullable: true },
      ip_type: { kind: "text", nullable: true, values: ["original", "licensed"] },
      franchise_name: { kind: "text", nullable: true },
      short_summary: { kind: "text", nullable: true },
      full_overview: { kind: "text", nullable: true },
      story_lore: { kind: "text", nullable: true },
      experience_description: { kind: "text", nullable: true },
      development_notes: { kind: "text", nullable: true },
      opening_date: { kind: "text", nullable: true },
      closing_date: { kind: "text", nullable: true },
      location_notes: { kind: "text", nullable: true },
      // The year it genuinely first ran, where that's known. Never inferred
      // from the archive's own earliest year, so it stays null far more
      // often than not.
      debut_year: { kind: "int", nullable: true },
      is_sample: { kind: "flag" },
      ...TIMESTAMPS,
    },
  },
  {
    key: "attractionParks",
    table: "attraction_parks",
    label: "Venue assignments",
    orderBy: "attraction_id, park_id",
    columns: {
      attraction_id: { kind: "text", references: "attractions" },
      // Venues are reference data seeded by a migration, so the known ids are
      // most of the validation — a backup naming some other venue is corrupt.
      park_id: { kind: "text", values: PARK_ID_VALUES, references: "venues" },
    },
  },
  {
    key: "seasonAppearances",
    table: "season_appearances",
    label: "Season appearances",
    orderBy: "attraction_id, season_id",
    columns: {
      attraction_id: { kind: "text", references: "attractions" },
      season_id: { kind: "text", references: "eventYears" },
      notes: { kind: "text", nullable: true },
      created_at: { kind: "text" },
    },
  },
  {
    key: "characters",
    table: "characters",
    label: "Characters",
    orderBy: "id",
    columns: {
      id: { kind: "text" },
      attraction_id: { kind: "text", references: "attractions" },
      name: { kind: "text" },
      description: { kind: "text", nullable: true },
      ...TIMESTAMPS,
    },
  },
  {
    key: "attractionRelations",
    table: "attraction_relations",
    label: "Related attractions",
    orderBy: "id",
    columns: {
      id: { kind: "text" },
      attraction_id: { kind: "text", references: "attractions" },
      related_attraction_id: { kind: "text", references: "attractions" },
      relation_type: {
        kind: "text",
        values: [
          "sequel",
          "previous_version",
          "same_franchise",
          "related_concept",
          "reimagining_of",
          "revival_of",
        ],
      },
      notes: { kind: "text", nullable: true },
      ...TIMESTAMPS,
    },
  },
  {
    key: "sources",
    table: "sources",
    label: "Sources",
    orderBy: "id",
    columns: {
      id: { kind: "text" },
      source_type: {
        kind: "text",
        values: [
          "youtube",
          "article",
          "official_site",
          "promotional",
          "book",
          "podcast",
          "interview",
          "social_media",
          "other",
        ],
      },
      title: { kind: "text" },
      url: { kind: "text", nullable: true },
      publisher: { kind: "text", nullable: true },
      published_at: { kind: "text", nullable: true },
      notes: { kind: "text", nullable: true },
      is_sample: { kind: "flag" },
      ...TIMESTAMPS,
    },
  },
  {
    key: "attractionSources",
    table: "attraction_sources",
    label: "Attraction citations",
    orderBy: "attraction_id, source_id",
    columns: {
      attraction_id: { kind: "text", references: "attractions" },
      source_id: { kind: "text", references: "sources" },
      // Set when a source speaks for one venue's version of a merged
      // attraction rather than for the record as a whole.
      venue_id: { kind: "text", nullable: true, values: PARK_ID_VALUES, references: "venues" },
    },
  },
  {
    key: "eventYearSources",
    table: "event_year_sources",
    label: "Event year citations",
    orderBy: "event_year_id, source_id",
    columns: {
      event_year_id: { kind: "text", references: "eventYears" },
      source_id: { kind: "text", references: "sources" },
    },
  },
  {
    key: "media",
    table: "media",
    label: "Media records",
    orderBy: "id",
    columns: {
      id: { kind: "text" },
      attraction_id: { kind: "text", nullable: true, references: "attractions" },
      event_year_id: { kind: "text", nullable: true, references: "eventYears" },
      haunt_id: { kind: "text", nullable: true, references: "haunts" },
      media_type: {
        kind: "text",
        values: ["poster", "promotional_image", "logo", "event_artwork", "local_image"],
      },
      url: { kind: "text", nullable: true },
      local_path: { kind: "text", nullable: true },
      source_id: { kind: "text", nullable: true, references: "sources" },
      attribution: { kind: "text", nullable: true },
      license_notes: { kind: "text", nullable: true },
      distribution: { kind: "text", values: ["reference", "local", "bundled"] },
      ...TIMESTAMPS,
    },
    rowCheck: (row) => {
      const owners = [row.attraction_id, row.event_year_id, row.haunt_id].filter(
        (owner) => owner !== null,
      );
      if (owners.length !== 1) {
        return "media must belong to exactly one attraction, season or haunt";
      }
      if (row.url === null && row.local_path === null) {
        return "media needs either a url or a local_path";
      }
      return null;
    },
  },
  {
    key: "attractionVenueWiki",
    table: "attraction_venue_wiki",
    label: "Venue-specific wiki sections",
    orderBy: "attraction_id, venue_id",
    columns: {
      attraction_id: { kind: "text", references: "attractions" },
      venue_id: { kind: "text", values: PARK_ID_VALUES, references: "venues" },
      overview: { kind: "text", nullable: true },
      story_lore: { kind: "text", nullable: true },
      experience_description: { kind: "text", nullable: true },
      development_notes: { kind: "text", nullable: true },
      location_notes: { kind: "text", nullable: true },
      ...TIMESTAMPS,
    },
  },
  {
    key: "ratings",
    table: "user_ratings",
    label: "Ratings",
    orderBy: "id",
    columns: {
      id: { kind: "text" },
      attraction_id: { kind: "text", references: "attractions" },
      // `total` is generated by the database from these three and is never
      // carried in a backup — a restored total is always recomputed.
      theme: { kind: "real", check: isValidRatingValue },
      fun: { kind: "real", check: isValidRatingValue },
      fear: { kind: "real", check: isValidRatingValue },
      ...TIMESTAMPS,
    },
  },
  {
    key: "notes",
    table: "user_notes",
    label: "Notes",
    orderBy: "id",
    columns: {
      id: { kind: "text" },
      attraction_id: { kind: "text", references: "attractions" },
      note: { kind: "text" },
      ...TIMESTAMPS,
    },
  },
  {
    key: "rankings",
    table: "user_rankings",
    label: "Manual ranking positions",
    orderBy: "scope, position",
    columns: {
      id: { kind: "text" },
      // One list per scope — a haunt's houses, its scare zones, or the same
      // across all haunts. Deliberately free text: a scope a build doesn't
      // know about is carried through a backup rather than dropped.
      scope: { kind: "text" },
      attraction_id: { kind: "text", references: "attractions" },
      position: { kind: "int" },
      ...TIMESTAMPS,
    },
  },
  {
    key: "settings",
    table: "user_settings",
    label: "Stored settings",
    orderBy: "key",
    columns: {
      key: { kind: "text" },
      value: { kind: "text" },
      updated_at: { kind: "text" },
    },
  },
  {
    key: "migrationConflicts",
    table: "migration_conflicts",
    label: "Migration conflict reports",
    orderBy: "id",
    columns: {
      id: { kind: "text" },
      migration: { kind: "text" },
      kind: { kind: "text" },
      // Ids, but not foreign keys: a report may name a record that the very
      // migration it describes went on to merge away, and losing the report
      // would be worse than holding an id nothing points at any more.
      subject_id: { kind: "text", nullable: true },
      other_id: { kind: "text", nullable: true },
      detail: { kind: "text" },
      resolved_at: { kind: "text", nullable: true },
      created_at: { kind: "text" },
    },
  },
];

export function columnNames(spec: BackupTableSpec): string[] {
  return Object.keys(spec.columns);
}
