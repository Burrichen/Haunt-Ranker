import type { EntityId, Timestamped } from "./common";

export type MediaType = "poster" | "promotional_image" | "logo" | "event_artwork" | "local_image";

/** Media belongs to exactly one attraction OR one event year, never both. */
export type MediaOwner = { attractionId: EntityId } | { eventYearId: EntityId };

/**
 * What the archive may actually do with a piece of media — deliberately
 * separate from where the file currently is. Finding an image online has
 * never been permission to ship it.
 *
 * - `reference`: a link and nothing more. Never copied, never bundled. The
 *   default, because it's the only safe assumption without a decision.
 * - `local`: a file the user chose, copied into the app's own data
 *   directory. Theirs, on their machine, never shipped.
 * - `bundled`: explicitly cleared for distribution with the app, one asset
 *   at a time.
 */
export type MediaDistribution = "reference" | "local" | "bundled";

/**
 * Media metadata — never assume artwork found online can legally be
 * bundled with the app. `attribution`/`licenseNotes` exist to record that
 * judgment explicitly rather than leaving it implicit.
 */
export interface Media extends Timestamped {
  id: EntityId;
  attractionId: EntityId | null;
  eventYearId: EntityId | null;
  mediaType: MediaType;
  /** A remote original, referenced in place. */
  url: string | null;
  /** A path *relative to the app's data directory* — never the user's original filepath. */
  localPath: string | null;
  sourceId: EntityId | null;
  attribution: string | null;
  licenseNotes: string | null;
  distribution: MediaDistribution;
}

export interface MediaInput {
  owner: MediaOwner;
  mediaType: MediaType;
  /** At least one of `url`/`localPath` is required. */
  url?: string | null;
  localPath?: string | null;
  sourceId?: EntityId | null;
  attribution?: string | null;
  licenseNotes?: string | null;
  /** Defaults to `reference` — nothing is assumed distributable. */
  distribution?: MediaDistribution;
}
