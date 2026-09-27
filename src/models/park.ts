import type { HauntId } from "./haunt";

/**
 * Venues are data, not a fixed lookup: a haunt brings its own, and the ids
 * below are the ones seeded by a migration rather than the only ones
 * possible. Each belongs to one haunt, which is what keeps Knott's Berry
 * Farm out of an HHN venue filter.
 */
export const PARK_IDS = {
  hollywood: "hollywood",
  orlando: "orlando",
  knottsBerryFarm: "knotts-berry-farm",
} as const;

export type ParkId = string;

/**
 * The marks a venue may use. A pack picks one of the app's own icons —
 * it can't ship artwork, and an unrecognised name falls back to a plain
 * marker rather than to nothing.
 */
export const VENUE_ICONS = ["star", "palm", "ferris-wheel", "tent", "trees", "pin"] as const;
export type VenueIcon = (typeof VENUE_ICONS)[number];
export const DEFAULT_VENUE_ICON: VenueIcon = "pin";

export function isVenueIcon(value: unknown): value is VenueIcon {
  return typeof value === "string" && (VENUE_ICONS as readonly string[]).includes(value);
}

export interface Park {
  id: ParkId;
  name: string;
  hauntId: HauntId;
  /** Which of the app's marks stands for this venue. */
  icon: VenueIcon;
  sortOrder: number;
  /** Which pack introduced this venue, where one did. */
  packId: string | null;
}

export interface ParkInput {
  id: ParkId;
  name: string;
  hauntId: HauntId;
  icon?: VenueIcon;
  sortOrder?: number;
  packId?: string | null;
}

/** Venue is the word the app uses now; Park is kept as the stored name. */
export type Venue = Park;
export type VenueId = ParkId;
export type VenueInput = ParkInput;
