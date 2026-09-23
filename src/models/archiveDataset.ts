import type { AttractionType, IpType } from "./attraction";
import type { RelationType } from "./attractionRelation";
import type { MediaDistribution, MediaType } from "./media";
import type { ParkId } from "./park";
import type { SourceType } from "./source";

/**
 * The version of the *dataset file format* — not of the data in it, and not
 * of the database schema. It moves only when the shape of the file changes in
 * a way an older reader would get wrong.
 */
export const ARCHIVE_FORMAT_VERSION = 1;

/**
 * The canonical shape of real Halloween Horror Nights archive data.
 *
 * This is the contract between whoever assembles the archive and the app. It
 * is deliberately human-readable and human-reviewable: a person should be able
 * to open the file, read an attraction's entry, and check it against a source
 * without running anything.
 *
 * Two rules matter more than the field list:
 *
 *  1. **Identity is an explicit id, never a display name.** Names get
 *     corrected, re-cased, disambiguated and re-translated; if identity came
 *     from the name, every correction would look like a new attraction and
 *     would strand the rating attached to the old one. Every entity carries a
 *     stable `id` chosen once and kept forever, and `previousIds` for the rare
 *     case where an id itself has to change.
 *  2. **A dataset describes the archive, never the user.** There is no place
 *     in this format for a rating, a note or a ranking position, because an
 *     import must never be able to express one.
 */
export interface ArchiveDataset {
  formatVersion: number;
  /** The dataset's own version, e.g. "2026.09.1". Free-form, for humans. */
  datasetVersion?: string;
  /** ISO 8601. When this file was assembled. */
  generatedAt?: string;
  /** Anything a reader should know about this revision — scope, gaps, caveats. */
  notes?: string;
  events: ArchiveEvent[];
  attractions: ArchiveAttraction[];
  /** Shared across everything that cites them, so one source is written once. */
  sources?: ArchiveSource[];
}

/**
 * One event year. A single record covers both parks: which parks an
 * attraction actually ran at is recorded on the attraction, because that's
 * where it differs.
 */
export interface ArchiveEvent {
  id: string;
  previousIds?: string[];
  /** Which haunt's season this is. Defaults to Halloween Horror Nights. */
  hauntId?: string;
  calendarYear: number;
  name: string;
  description?: string | null;
  /** How this year's entry was put together — a note about the sourcing itself. */
  sourceNotes?: string | null;
  /** ISO dates for the run, where they're known. */
  dates?: ArchiveDateRange;
  /** Ids of entries in the top-level `sources` list. */
  sourceIds?: string[];
  media?: ArchiveMedia[];
}

export interface ArchiveDateRange {
  /** ISO date (YYYY-MM-DD). */
  start?: string | null;
  end?: string | null;
}

export interface ArchiveAttraction {
  id: string;
  previousIds?: string[];
  /** The `id` of an entry in `events`. */
  eventId: string;
  type: AttractionType;
  name: string;
  /**
   * The URL segment. Defaults to the id, which is already slug-shaped. Unlike
   * the id it may be changed to follow a rename — it's addressing, not
   * identity.
   */
  slug?: string;
  /**
   * What distinguishes this record from another of the same name — "Hollywood
   * version", "2019 remount". Set it when a substantially different version
   * gets its own record.
   */
  variantName?: string | null;
  /**
   * Where it ran. Both parks in one record means *the same attraction*
   * appeared at both. A version different enough to describe separately is a
   * separate record with its own id, linked by a `previous_version` relation.
   */
  parks: ParkId[];
  ip?: ArchiveIp | null;
  /** One or two sentences. The card and hover preview use this. */
  summary?: string | null;
  wiki?: ArchiveWikiSections;
  /**
   * What was true of one venue's build and not of the record as a whole.
   *
   * A house that ran at Hollywood and Orlando under the same name is one
   * attraction here, however much the two builds differed. This is where
   * those differences go, so merging never means losing them. Only for
   * venues the attraction actually ran at, and only where something is
   * known — an empty entry is a heading with nothing under it.
   */
  venueWiki?: ArchiveVenueWiki[];
  /** Where it stood — a soundstage, a lot, a street. */
  location?: string | null;
  dates?: ArchiveDateRange;
  characters?: ArchiveCharacter[];
  related?: ArchiveRelation[];
  media?: ArchiveMedia[];
  sourceIds?: string[];
}

export interface ArchiveIp {
  type: IpType;
  /** The franchise a licensed attraction belongs to; also useful for original series. */
  franchise?: string | null;
}

/** The long-form sections of a wiki page. Every one is optional. */
export interface ArchiveWikiSections {
  overview?: string | null;
  story?: string | null;
  experience?: string | null;
  development?: string | null;
}

export interface ArchiveVenueWiki extends ArchiveWikiSections {
  /** Must be one of the attraction's own parks. */
  park: ParkId;
  location?: string | null;
  /**
   * Sources that speak for this venue's build rather than for the record as
   * a whole — a walkthrough of one park's version, say. Ids of entries in
   * the top-level `sources` list.
   */
  sourceIds?: string[];
}

export interface ArchiveCharacter {
  id: string;
  name: string;
  description?: string | null;
}

export interface ArchiveRelation {
  /** The `id` of another attraction in this dataset, or one already imported. */
  attractionId: string;
  type: RelationType;
  notes?: string | null;
}

/**
 * Metadata about an image — never the image itself, and never a path on
 * anyone's machine.
 *
 * `distribution` says what the archive may do with it. A dataset may only
 * declare `reference` (link to the original, the default) or `bundled` (a
 * deliberate, recorded decision that this asset may ship with the app).
 * `local` describes a file a user chose on their own computer, so it can
 * never come from a dataset.
 */
export interface ArchiveMedia {
  id: string;
  kind: MediaType;
  url: string;
  attribution?: string | null;
  licenseNotes?: string | null;
  /** The `id` of an entry in `sources`. */
  sourceId?: string | null;
  distribution?: Exclude<MediaDistribution, "local">;
}

export interface ArchiveSource {
  id: string;
  type: SourceType;
  title: string;
  url?: string | null;
  /** The publisher, site or YouTube channel. */
  publisher?: string | null;
  /** ISO date, where it's known. */
  publishedAt?: string | null;
  notes?: string | null;
}
