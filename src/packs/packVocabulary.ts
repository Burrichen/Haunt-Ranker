import type { AttractionType } from "../models/attraction";

/**
 * The closed sets a Haunt Pack chooses from.
 *
 * They live here, not in the validator, because two things have to agree
 * on them exactly: the validator that refuses a pack using anything else,
 * and the research prompt that tells an assistant what it may use. A value
 * added here is accepted and advertised in the same change.
 */

/**
 * A stable id: lowercase, unambiguous in a URL, and obviously not a
 * display name. Colons are allowed so a pack can namespace its ids —
 * `mff:2026:walkthrough:hollow-road`.
 */
export const PACK_ID_PATTERN = /^[a-z0-9][a-z0-9:-]{1,119}$/;

export const EXPERIENCE_CATEGORIES: readonly AttractionType[] = [
  "house",
  "scare_zone",
  "show",
  "other",
];
export const IP_TYPES = ["original", "licensed"] as const;
export const RELATION_TYPES = [
  "sequel",
  "previous_version",
  "same_franchise",
  "related_concept",
  "reimagining_of",
  "revival_of",
] as const;
export const MEDIA_KINDS = [
  "poster",
  "promotional_image",
  "logo",
  "event_artwork",
  "map",
  "local_image",
] as const;
/** `local` is deliberately absent: it names a file on one person's machine. */
export const PACK_DISTRIBUTIONS = ["reference", "unclear", "bundled"] as const;
export const SOURCE_TYPES = [
  "youtube",
  "article",
  "official_site",
  "promotional",
  "book",
  "podcast",
  "interview",
  "social_media",
  "other",
] as const;

export const MIN_CALENDAR_YEAR = 1900;
export const MAX_CALENDAR_YEAR = 2200;
