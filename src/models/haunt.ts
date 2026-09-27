import type { Timestamped } from "./common";
import type { AttractionType } from "./attraction";

/**
 * A haunt is a Halloween event with its own seasons, venues and vocabulary.
 *
 * Haunts are **data**. The two the app ships with are seeded by a
 * migration, and any other arrives as a Haunt Pack — so nothing here may
 * assume a fixed set of them. `HauntId` is a plain string for exactly that
 * reason: the ids below are the seeded ones, not the possible ones.
 */
export const HAUNT_IDS = {
  hhn: "hhn",
  knotts: "knotts-scary-farm",
} as const;

export type HauntId = string;

/** The accents a haunt may use. A pack chooses from the app's palette, not its own. */
export const HAUNT_ACCENTS = ["orange", "purple", "green", "blue"] as const;
export type HauntAccent = (typeof HAUNT_ACCENTS)[number];
export const DEFAULT_HAUNT_ACCENT: HauntAccent = "orange";

export function isHauntAccent(value: unknown): value is HauntAccent {
  return typeof value === "string" && (HAUNT_ACCENTS as readonly string[]).includes(value);
}

export interface Haunt extends Timestamped {
  id: HauntId;
  name: string;
  /** What the UI uses where there isn't room for the full name: "HHN", "Knott's". */
  shortName: string;
  description: string | null;
  /** One line about the haunt, for cards and landing pages. */
  tagline: string | null;
  accent: HauntAccent;
  /** Where it runs, in plain words — "Hollywood and Orlando". */
  venuesLabel: string | null;
  /** Lower sorts first. The collection the app opens on leads. */
  sortOrder: number;
  /** Which pack last described this haunt, where one did. */
  packId: string | null;
  packVersion: string | null;
  packUpdatedAt: string | null;
}

export interface HauntInput {
  id: string;
  name: string;
  shortName: string;
  description?: string | null;
  tagline?: string | null;
  accent?: HauntAccent;
  venuesLabel?: string | null;
  sortOrder?: number;
  packId?: string | null;
  packVersion?: string | null;
}

/**
 * Which haunt the app is currently looking at.
 *
 * `all` is a context in its own right rather than "no choice made": it is
 * where the archives sit side by side. The rest are haunt ids, so the set
 * grows with the data rather than with the source code.
 */
export const ALL_HAUNTS = "all";
export type HauntScope = typeof ALL_HAUNTS | HauntId;

/**
 * What the app opens on when nothing has been chosen.
 *
 * Halloween Horror Nights is the collection Haunt Ranker was built around
 * and what a reader opening it expects to find; Settings can change it.
 * It is a default, not a privilege — if it isn't installed, the first
 * haunt in the registry takes its place.
 */
export const DEFAULT_HAUNT_SCOPE: HauntScope = HAUNT_IDS.hhn;

/** The haunt a scope narrows to, or `null` for All Haunts. */
export function scopeHauntId(scope: HauntScope): HauntId | null {
  return scope === ALL_HAUNTS ? null : scope;
}

/** Whether something belonging to `hauntId` is visible in this scope. */
export function isInHauntScope(hauntId: string | null | undefined, scope: HauntScope): boolean {
  return scope === ALL_HAUNTS || hauntId === scope;
}

/**
 * The attraction categories the app reasons about.
 *
 * Closed, because the app genuinely behaves differently for each: a
 * walk-through is ranked and rated, a scare zone is a place, a show has a
 * running time. What each haunt *calls* them is open, and lives in
 * `experience_types` — see `ExperienceType`.
 *
 * `house` is the walk-through category's stored name, kept because every
 * row, backup and saved ranking scope already uses it.
 */
export const ATTRACTION_CATEGORIES: AttractionType[] = ["house", "scare_zone", "show", "other"];

/** The word to fall back to when no haunt has named this kind of experience. */
const GENERIC_LABELS: Record<AttractionType, { one: string; many: string }> = {
  house: { one: "Walk-through", many: "Walk-throughs" },
  scare_zone: { one: "Scare Zone", many: "Scare Zones" },
  show: { one: "Show", many: "Shows" },
  other: { one: "Experience", many: "Experiences" },
};

export function genericTypeLabel(type: AttractionType, form: "one" | "many" = "one"): string {
  return GENERIC_LABELS[type][form];
}

/**
 * The most names the app will read out before falling back to the generic
 * word. "Houses & Mazes" is a heading; "Houses, Mazes, Trails & Hayrides"
 * is a list pretending to be one.
 */
const MAX_COMBINED_LABELS = 3;

/**
 * One label for a list that spans haunts which don't agree on the word.
 *
 * Given the labels in play it joins them — "Houses & Mazes" — until there
 * are too many to read, and then says the generic thing instead.
 */
export function combineLabels(labels: string[], fallback: string): string {
  const distinct = [...new Set(labels.filter((label) => label !== ""))];

  if (distinct.length === 0) {
    return fallback;
  }
  if (distinct.length === 1) {
    return distinct[0];
  }
  if (distinct.length > MAX_COMBINED_LABELS) {
    return fallback;
  }
  return `${distinct.slice(0, -1).join(", ")} & ${distinct[distinct.length - 1]}`;
}
