import type { ReactNode } from "react";
import { buildRegistry, HauntRegistryContext } from "../hooks/useHauntRegistry";
import type { ExperienceType } from "../models/experienceType";
import { HAUNT_IDS, type Haunt } from "../models/haunt";
import type { Venue } from "../models/park";

const TIMESTAMPS = {
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

/**
 * The haunts a migration seeds, as a component test sees them.
 *
 * The app loads these from the database at startup; a component rendered on
 * its own has no database, so tests hand it the same rows. Deliberately the
 * seeded two and nothing more — a test that needs a third haunt builds its
 * own registry, which is also how the pack tests prove the interface can
 * hold one.
 */
export const TEST_HAUNTS: Haunt[] = [
  {
    id: HAUNT_IDS.hhn,
    name: "Halloween Horror Nights",
    shortName: "HHN",
    description: null,
    tagline: "Universal's Halloween event, at Hollywood and Orlando.",
    accent: "orange",
    venuesLabel: "Hollywood and Orlando",
    sortOrder: 0,
    packId: null,
    packVersion: null,
    packUpdatedAt: null,
    ...TIMESTAMPS,
  },
  {
    id: HAUNT_IDS.knotts,
    name: "Knott's Scary Farm",
    shortName: "Knott's",
    description: null,
    tagline: "The Halloween event at Knott's Berry Farm, Buena Park.",
    accent: "purple",
    venuesLabel: "Knott's Berry Farm",
    sortOrder: 10,
    packId: null,
    packVersion: null,
    packUpdatedAt: null,
    ...TIMESTAMPS,
  },
];

export const TEST_VENUES: Venue[] = [
  {
    id: "hollywood",
    name: "Hollywood",
    hauntId: HAUNT_IDS.hhn,
    icon: "star",
    sortOrder: 0,
    packId: null,
  },
  {
    id: "orlando",
    name: "Orlando",
    hauntId: HAUNT_IDS.hhn,
    icon: "palm",
    sortOrder: 10,
    packId: null,
  },
  {
    id: "knotts-berry-farm",
    name: "Knott's Berry Farm",
    hauntId: HAUNT_IDS.knotts,
    icon: "ferris-wheel",
    sortOrder: 20,
    packId: null,
  },
];

export const TEST_EXPERIENCE_TYPES: ExperienceType[] = [
  {
    id: "hhn:type:house",
    hauntId: HAUNT_IDS.hhn,
    category: "house",
    labelOne: "House",
    labelMany: "Houses",
    description: null,
    sortOrder: 0,
    packId: null,
    ...TIMESTAMPS,
  },
  {
    id: "hhn:type:scare-zone",
    hauntId: HAUNT_IDS.hhn,
    category: "scare_zone",
    labelOne: "Scare Zone",
    labelMany: "Scare Zones",
    description: null,
    sortOrder: 10,
    packId: null,
    ...TIMESTAMPS,
  },
  {
    id: "knotts-scary-farm:type:maze",
    hauntId: HAUNT_IDS.knotts,
    category: "house",
    labelOne: "Maze",
    labelMany: "Mazes",
    description: null,
    sortOrder: 0,
    packId: null,
    ...TIMESTAMPS,
  },
  {
    id: "knotts-scary-farm:type:scare-zone",
    hauntId: HAUNT_IDS.knotts,
    category: "scare_zone",
    labelOne: "Scare Zone",
    labelMany: "Scare Zones",
    description: null,
    sortOrder: 10,
    packId: null,
    ...TIMESTAMPS,
  },
];

export const TEST_REGISTRY = buildRegistry({
  haunts: TEST_HAUNTS,
  venues: TEST_VENUES,
  experienceTypes: TEST_EXPERIENCE_TYPES,
});

/** Wraps a component in the seeded registry, as the app shell would. */
export function TestHaunts({ children }: { children: ReactNode }) {
  return (
    <HauntRegistryContext.Provider value={TEST_REGISTRY}>{children}</HauntRegistryContext.Provider>
  );
}
