import { createContext, useContext } from "react";
import type { AttractionType } from "../models/attraction";
import type { ExperienceType } from "../models/experienceType";
import {
  ALL_HAUNTS,
  ATTRACTION_CATEGORIES,
  combineLabels,
  genericTypeLabel,
  type Haunt,
  type HauntId,
  type HauntScope,
} from "../models/haunt";
import { DEFAULT_VENUE_ICON, type Venue, type VenueIcon, type VenueId } from "../models/park";

/**
 * Everything the interface needs to know about the haunts that exist —
 * their names, their accents, their venues and their vocabulary — loaded
 * once from the database rather than compiled into the app.
 *
 * Haunt Ranker supports exactly two haunts, HHN and Knott's Scary Farm, but
 * their names, venues and vocabulary ("House" vs "Maze") still come from
 * rows rather than from branches in each screen.
 */
export interface HauntRegistry {
  isLoading: boolean;
  error: string | null;
  /** Every haunt, in presentation order — the home collection first. */
  haunts: Haunt[];
  venues: Venue[];
  experienceTypes: ExperienceType[];

  haunt(hauntId: string | null | undefined): Haunt | null;
  /** The haunt's full name, or null where it isn't one we hold. */
  hauntName(hauntId: string | null | undefined): string | null;
  /** How a scope names itself: "All Haunts", or the haunt's name. */
  scopeLabel(scope: HauntScope, form?: "full" | "short"): string;
  /** Every scope the selector offers: All Haunts, then each haunt. */
  scopes(): HauntScope[];

  venuesFor(hauntId: string | null | undefined): Venue[];
  venue(venueId: VenueId): Venue | null;
  venueName(venueId: VenueId): string;
  venueIcon(venueId: VenueId): VenueIcon;

  /**
   * What to call this kind of experience for this haunt: "House", "Maze",
   * "Trail". Passing `null` for the haunt asks for wording that fits every
   * haunt at once — "Houses & Mazes", or the generic word where there are
   * too many to read out.
   */
  label(type: AttractionType, hauntId: string | null | undefined, form?: "one" | "many"): string;
  /** The types one haunt holds, in its own order. */
  typesFor(hauntId: string | null | undefined): ExperienceType[];
  /** The categories in use across the app, for filters and headings. */
  categories(hauntId: string | null | undefined): AttractionType[];
  /** Re-reads the haunts, for when a backup restore has just replaced them. */
  refresh(): void;
}

/**
 * What the registry answers before it has loaded, or outside the provider.
 *
 * Deliberately empty rather than seeded with the two haunts the app ships
 * with: a registry that quietly knew about HHN would hide exactly the bug
 * this design exists to prevent.
 */
export const EMPTY_REGISTRY: HauntRegistry = {
  isLoading: true,
  error: null,
  haunts: [],
  venues: [],
  experienceTypes: [],
  haunt: () => null,
  hauntName: () => null,
  scopeLabel: (scope) => (scope === ALL_HAUNTS ? "All Haunts" : scope),
  scopes: () => [ALL_HAUNTS],
  venuesFor: () => [],
  venue: () => null,
  venueName: (venueId) => venueId,
  venueIcon: () => DEFAULT_VENUE_ICON,
  label: (type, _hauntId, form = "one") => genericTypeLabel(type, form),
  typesFor: () => [],
  categories: () => [...ATTRACTION_CATEGORIES],
  refresh: () => {},
};

export const HauntRegistryContext = createContext<HauntRegistry | null>(null);

export function useHauntRegistry(): HauntRegistry {
  return useContext(HauntRegistryContext) ?? EMPTY_REGISTRY;
}

/** Builds a registry over already-loaded rows. Pure, so it can be tested without a database. */
export function buildRegistry(options: {
  haunts: Haunt[];
  venues: Venue[];
  experienceTypes: ExperienceType[];
  isLoading?: boolean;
  error?: string | null;
}): HauntRegistry {
  const haunts = [...options.haunts].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  );
  const venues = [...options.venues].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  );
  const types = [...options.experienceTypes].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.labelMany.localeCompare(b.labelMany),
  );

  const hauntById = new Map(haunts.map((haunt) => [haunt.id, haunt]));
  const venueById = new Map(venues.map((venue) => [venue.id, venue]));

  const typesFor = (hauntId: string | null | undefined): ExperienceType[] =>
    hauntId ? types.filter((type) => type.hauntId === hauntId) : types;

  const label = (
    type: AttractionType,
    hauntId: string | null | undefined,
    form: "one" | "many" = "one",
  ): string => {
    const matching = typesFor(hauntId).filter((entry) => entry.category === type);
    const labels = matching.map((entry) => (form === "one" ? entry.labelOne : entry.labelMany));

    if (hauntId) {
      // Inside one haunt there is one right word, and the generic one is
      // only reached where that haunt has no type of this kind at all.
      return labels[0] ?? genericTypeLabel(type, form);
    }
    return combineLabels(labels, genericTypeLabel(type, form));
  };

  return {
    isLoading: options.isLoading ?? false,
    error: options.error ?? null,
    haunts,
    venues,
    experienceTypes: types,

    haunt: (hauntId) => (hauntId ? (hauntById.get(hauntId) ?? null) : null),
    hauntName: (hauntId) => (hauntId ? (hauntById.get(hauntId)?.name ?? null) : null),
    scopeLabel: (scope, form = "full") => {
      if (scope === ALL_HAUNTS) {
        return form === "short" ? "All" : "All Haunts";
      }
      const haunt = hauntById.get(scope);
      if (!haunt) {
        return scope;
      }
      return form === "short" ? haunt.shortName : haunt.name;
    },
    scopes: () => [ALL_HAUNTS, ...haunts.map((haunt) => haunt.id as HauntScope)],

    venuesFor: (hauntId) =>
      hauntId ? venues.filter((venue) => venue.hauntId === hauntId) : venues,
    venue: (venueId) => venueById.get(venueId) ?? null,
    venueName: (venueId) => venueById.get(venueId)?.name ?? venueId,
    venueIcon: (venueId) => venueById.get(venueId)?.icon ?? DEFAULT_VENUE_ICON,

    label,
    typesFor,
    // Walk-throughs are the only category in the product, whatever types
    // a haunt happens to have recorded.
    categories: () => [...ATTRACTION_CATEGORIES],
    refresh: () => {},
  };
}

/** The id of the haunt a scope refers to, or null for All Haunts. */
export function scopeHaunt(scope: HauntScope): HauntId | null {
  return scope === ALL_HAUNTS ? null : scope;
}
