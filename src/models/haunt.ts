import type { Timestamped } from "./common";
import type { AttractionType } from "./attraction";

/**
 * A haunt is a Halloween event with its own seasons, venues and vocabulary.
 * Haunt Ranker holds two, and neither is an add-on to the other.
 *
 * The ids are fixed and referenced by seeded data, so they are typed rather
 * than left as free strings.
 */
export const HAUNT_IDS = {
  hhn: "hhn",
  knotts: "knotts-scary-farm",
} as const;

export type HauntId = (typeof HAUNT_IDS)[keyof typeof HAUNT_IDS];

export interface Haunt extends Timestamped {
  id: HauntId;
  name: string;
  /** What the UI uses where there isn't room for the full name: "HHN", "Knott's". */
  shortName: string;
  description: string | null;
}

export interface HauntInput {
  id: string;
  name: string;
  shortName: string;
  description?: string | null;
}

/**
 * The seeded haunts' names, for the places the UI has to offer a choice
 * before anything has been loaded from the database.
 */
export const HAUNT_NAMES: Record<HauntId, { name: string; shortName: string }> = {
  [HAUNT_IDS.hhn]: { name: "Halloween Horror Nights", shortName: "HHN" },
  [HAUNT_IDS.knotts]: { name: "Knott's Scary Farm", shortName: "Knott's" },
};

/**
 * Which haunt the app is currently looking at.
 *
 * `all` is a context in its own right rather than "no choice made": it is
 * where the two archives sit side by side, and it is the default, because
 * neither haunt is the app's real subject with the other bolted on.
 */
export const HAUNT_SCOPES = ["all", HAUNT_IDS.hhn, HAUNT_IDS.knotts] as const;
export type HauntScope = (typeof HAUNT_SCOPES)[number];
export const DEFAULT_HAUNT_SCOPE: HauntScope = "all";

export function isHauntScope(value: unknown): value is HauntScope {
  return typeof value === "string" && (HAUNT_SCOPES as readonly string[]).includes(value);
}

/** The haunt a scope narrows to, or `null` for All Haunts. */
export function scopeHauntId(scope: HauntScope): HauntId | null {
  return scope === "all" ? null : scope;
}

export function hauntScopeLabel(scope: HauntScope, form: "full" | "short" = "full"): string {
  if (scope === "all") {
    return form === "short" ? "All" : "All Haunts";
  }
  return form === "short" ? HAUNT_NAMES[scope].shortName : HAUNT_NAMES[scope].name;
}

/** Whether something belonging to `hauntId` is visible in this scope. */
export function isInHauntScope(hauntId: string | null | undefined, scope: HauntScope): boolean {
  return scope === "all" || hauntId === scope;
}

/**
 * What each haunt calls its walk-through attractions.
 *
 * HHN has houses; Knott's has mazes. They are the same kind of thing to the
 * database and never the same word to a reader, so the label is chosen by
 * haunt at the point of display. The internal type stays `house` — a shared
 * category the user never sees.
 */
const ATTRACTION_LABELS: Record<string, Record<AttractionType, { one: string; many: string }>> = {
  [HAUNT_IDS.hhn]: {
    house: { one: "House", many: "Houses" },
    scare_zone: { one: "Scare Zone", many: "Scare Zones" },
  },
  [HAUNT_IDS.knotts]: {
    house: { one: "Maze", many: "Mazes" },
    scare_zone: { one: "Scare Zone", many: "Scare Zones" },
  },
};

/** The neutral wording for a mixed list, where one haunt's word would be wrong. */
const COMBINED_LABELS: Record<AttractionType, { one: string; many: string }> = {
  house: { one: "House or Maze", many: "Houses & Mazes" },
  scare_zone: { one: "Scare Zone", many: "Scare Zones" },
};

/**
 * The word to show a reader for this kind of attraction.
 *
 * Pass the haunt it belongs to; pass `null` for a list spanning both, where
 * "Houses & Mazes" is the only honest heading.
 */
export function attractionTypeLabel(
  type: AttractionType,
  hauntId: string | null,
  form: "one" | "many" = "one",
): string {
  const labels = (hauntId ? ATTRACTION_LABELS[hauntId] : undefined) ?? COMBINED_LABELS;
  return labels[type][form];
}
