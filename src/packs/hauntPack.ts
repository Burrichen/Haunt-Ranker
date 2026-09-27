import type { AttractionType, IpType } from "../models/attraction";
import type { RelationType } from "../models/attractionRelation";
import type { HauntAccent } from "../models/haunt";
import type { MediaDistribution, MediaType } from "../models/media";
import type { VenueIcon } from "../models/park";
import type { SourceType } from "../models/source";

/**
 * The Haunt Pack format: one Halloween event, described completely enough
 * that Haunt Ranker can hold it without knowing anything about it in
 * advance.
 *
 * The schema is deliberately about *haunts in general* and mentions none
 * in particular. Halloween Horror Nights and Knott's Scary Farm are
 * expressible in it, and so is an event nobody has written a line of code
 * for: a pack brings its own name, its own vocabulary ("Trail"), its own
 * venues and its own seasons.
 *
 * Three rules shape everything below:
 *
 *  1. **Identity is an explicit, namespaced id, never a display name.**
 *     `mff:2026:walkthrough:hollow-road` survives a rename; "Hollow Road"
 *     does not. Ids are how a later pack corrects a record instead of
 *     duplicating it.
 *  2. **A pack describes an archive, never a person.** There is no field
 *     anywhere in this format for a rating, a note or a ranking position,
 *     so no import can express one.
 *  3. **A pack brings data, not assets or code.** Media is referenced by
 *     URL with its attribution; icons and accents are chosen from the
 *     app's own sets.
 */
export const HAUNT_PACK_SCHEMA = "haunt-ranker.haunt-pack/v1";

/** The schema ids this build can read. Older ones would be listed here too. */
export const SUPPORTED_PACK_SCHEMAS = [HAUNT_PACK_SCHEMA];

export interface HauntPack {
  /** `haunt-ranker.haunt-pack/v1`. */
  schema: string;
  pack: PackMetadata;
  haunt: PackHaunt;
  /** What this haunt calls each kind of experience. */
  experienceTypes: PackExperienceType[];
  venues: PackVenue[];
  seasons: PackSeason[];
  experiences: PackExperience[];
  /** Shared by everything that cites them, so a source is written once. */
  sources?: PackSource[];
}

export interface PackMetadata {
  /** Stable id for the pack itself, e.g. `moonlight-fright-festival`. */
  id: string;
  /** The pack's own version. Free-form but ordered by whoever maintains it. */
  version: string;
  /** ISO 8601. When this file was generated. */
  generatedAt?: string;
  /** Who assembled it, and from what. Shown in the import preview. */
  provenance?: string;
  /** Anything a reader should know about this revision — scope, gaps, caveats. */
  notes?: string;
  /**
   * What the pack claims to contain. Checked against what it actually
   * contains, so a truncated file is caught before anything is written.
   */
  counts?: {
    seasons?: number;
    experiences?: number;
    sources?: number;
    media?: number;
  };
}

export interface PackHaunt {
  /** Stable id, and the namespace every other id in the pack sits under. */
  id: string;
  name: string;
  /** For places the full name won't fit: "HHN", "Knott's", "Moonlight". */
  shortName: string;
  description?: string | null;
  tagline?: string | null;
  /** Where it runs, in plain words. Shown next to the haunt's name. */
  venuesLabel?: string | null;
  accent?: HauntAccent;
  /** Lower sorts first. Packs land after the collections already installed. */
  sortOrder?: number;
}

export interface PackExperienceType {
  id: string;
  /** What the app reasons about: a walk-through, a zone, a show. */
  category: AttractionType;
  /** What a reader sees: "Trail" / "Trails". */
  labelOne: string;
  labelMany: string;
  description?: string | null;
  sortOrder?: number;
}

export interface PackVenue {
  id: string;
  name: string;
  /** One of the app's own marks. Anything else falls back to a plain pin. */
  icon?: VenueIcon;
  sortOrder?: number;
}

export interface PackSeason {
  id: string;
  previousIds?: string[];
  calendarYear: number;
  name: string;
  description?: string | null;
  /** How this season's entry was put together — a note about the sourcing. */
  sourceNotes?: string | null;
  dates?: PackDateRange;
  sourceIds?: string[];
  media?: PackMedia[];
}

export interface PackDateRange {
  /** ISO date (YYYY-MM-DD). */
  start?: string | null;
  end?: string | null;
}

export interface PackExperience {
  id: string;
  previousIds?: string[];
  /** The `id` of an entry in `seasons`. */
  seasonId: string;
  /** The `id` of an entry in `experienceTypes`. */
  typeId: string;
  name: string;
  /** URL segment; defaults to the id. Addressing, not identity. */
  slug?: string;
  /** What distinguishes this record from another of the same name. */
  variantName?: string | null;
  /** Venue ids from this pack. More than one means the same experience ran at each. */
  venues: string[];
  ip?: PackIp | null;
  summary?: string | null;
  wiki?: PackWikiSections;
  /** What differed at one venue, where the venues differed. */
  venueWiki?: PackVenueWiki[];
  location?: string | null;
  dates?: PackDateRange;
  /** The year it genuinely first ran, where that is established. Never inferred. */
  debutYear?: number | null;
  /** Seasons it is known to have run in, beyond the one it is filed under. */
  alsoAppearedIn?: string[];
  characters?: PackCharacter[];
  related?: PackRelation[];
  media?: PackMedia[];
  sourceIds?: string[];
}

export interface PackIp {
  type: IpType;
  franchise?: string | null;
}

export interface PackWikiSections {
  overview?: string | null;
  story?: string | null;
  experience?: string | null;
  development?: string | null;
}

export interface PackVenueWiki extends PackWikiSections {
  /** Must be one of the experience's own venues. */
  venue: string;
  location?: string | null;
  sourceIds?: string[];
}

export interface PackCharacter {
  id: string;
  name: string;
  description?: string | null;
}

export interface PackRelation {
  /** The `id` of another experience — in this pack, or already imported. */
  experienceId: string;
  type: RelationType;
  notes?: string | null;
}

/**
 * Metadata about an image — never the image itself. A pack may point at an
 * original (`reference`, the default) or record a deliberate decision that
 * an asset may ship (`bundled`). It can never claim a file on someone's
 * machine.
 */
export interface PackMedia {
  id: string;
  kind: MediaType;
  url: string;
  attribution?: string | null;
  licenseNotes?: string | null;
  sourceId?: string | null;
  distribution?: Exclude<MediaDistribution, "local">;
}

export interface PackSource {
  id: string;
  type: SourceType;
  title: string;
  url?: string | null;
  publisher?: string | null;
  publishedAt?: string | null;
  notes?: string | null;
}
