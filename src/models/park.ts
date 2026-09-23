import type { HauntId } from "./haunt";

/**
 * Venues are a fixed, seeded lookup — never user content. Each belongs to one
 * haunt, which is what keeps Knott's Berry Farm out of an HHN park filter.
 */
export const PARK_IDS = {
  hollywood: "hollywood",
  orlando: "orlando",
  knottsBerryFarm: "knotts-berry-farm",
} as const;

export type ParkId = (typeof PARK_IDS)[keyof typeof PARK_IDS];

export interface Park {
  id: ParkId;
  name: string;
  hauntId: HauntId;
}

/** Venue is the word the app uses now; Park is kept as the stored name. */
export type Venue = Park;
export type VenueId = ParkId;

/** The venues belonging to one haunt, in seeded order. */
export const HAUNT_VENUES: Record<HauntId, ParkId[]> = {
  hhn: [PARK_IDS.hollywood, PARK_IDS.orlando],
  "knotts-scary-farm": [PARK_IDS.knottsBerryFarm],
};
