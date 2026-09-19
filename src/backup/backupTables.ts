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
    key: "eventYears",
    table: "event_years",
    label: "Event years",
    orderBy: "id",
    columns: {
      id: { kind: "text" },
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
      is_sample: { kind: "flag" },
      ...TIMESTAMPS,
    },
  },
  {
    key: "attractionParks",
    table: "attraction_parks",
    label: "Park assignments",
    orderBy: "attraction_id, park_id",
    columns: {
      attraction_id: { kind: "text", references: "attractions" },
      // Parks are fixed reference data, so the known ids are the whole
      // validation — a backup naming some other park is corrupt.
      park_id: { kind: "text", values: PARK_ID_VALUES },
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
        values: ["sequel", "previous_version", "same_franchise", "related_concept"],
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
      const ownedByAttraction = row.attraction_id !== null;
      const ownedByYear = row.event_year_id !== null;
      if (ownedByAttraction === ownedByYear) {
        return "media must belong to exactly one attraction or one event year";
      }
      if (row.url === null && row.local_path === null) {
        return "media needs either a url or a local_path";
      }
      return null;
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
];

export function columnNames(spec: BackupTableSpec): string[] {
  return Object.keys(spec.columns);
}
