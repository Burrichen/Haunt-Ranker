import type { Attraction, IpType } from "../models/attraction";
import type { EventYear } from "../models/eventYear";
import type { ParkId } from "../models/park";
import type { Rating } from "../models/rating";
import { RATING_MIN, RATING_TOTAL_MAX } from "../models/rating";

/** One row the browser displays — an attraction plus everything else it needs to show/filter/sort. */
export interface AttractionBrowserRow {
  attraction: Attraction;
  eventYear: EventYear | null;
  posterUrl: string | null;
  /** `null` means genuinely unrated — never treated as a rating of 0. */
  rating: Rating | null;
  /** `null` means this attraction has no manual ranking position in scope. */
  rankingPosition: number | null;
}

export type ParkFacet = ParkId | "both";
export type RatedFacet = "rated" | "unrated";

export interface AttractionBrowserFilters {
  query: string;
  years: number[];
  parks: ParkFacet[];
  ipTypes: IpType[];
  rated: RatedFacet[];
  ratingMin: number;
  ratingMax: number;
}

export const RATING_RANGE_MIN = RATING_MIN;
export const RATING_RANGE_MAX = RATING_TOTAL_MAX;

export const DEFAULT_FILTERS: AttractionBrowserFilters = {
  query: "",
  years: [],
  parks: [],
  ipTypes: [],
  rated: [],
  ratingMin: RATING_RANGE_MIN,
  ratingMax: RATING_RANGE_MAX,
};

export function isRatingRangeActive(filters: AttractionBrowserFilters): boolean {
  return filters.ratingMin > RATING_RANGE_MIN || filters.ratingMax < RATING_RANGE_MAX;
}

/** Whether any filter would narrow the result set — drives the "Clear filters" affordance. */
export function areFiltersActive(filters: AttractionBrowserFilters): boolean {
  return (
    filters.query.trim() !== "" ||
    filters.years.length > 0 ||
    filters.parks.length > 0 ||
    filters.ipTypes.length > 0 ||
    filters.rated.length > 0 ||
    isRatingRangeActive(filters)
  );
}

export function matchesQuery(row: AttractionBrowserRow, query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return true;
  }
  const { name, franchiseName } = row.attraction;
  return (
    name.toLowerCase().includes(trimmed) ||
    (franchiseName?.toLowerCase().includes(trimmed) ?? false)
  );
}

/** "both" means the attraction ran at two or more parks, not "either park". */
export function matchesParkFacet(parkIds: ParkId[], facet: ParkFacet): boolean {
  if (facet === "both") {
    return parkIds.length >= 2;
  }
  return parkIds.includes(facet);
}

export function matchesFilters(
  row: AttractionBrowserRow,
  filters: AttractionBrowserFilters,
): boolean {
  const { attraction, rating, eventYear } = row;

  if (filters.years.length > 0) {
    if (eventYear === null || !filters.years.includes(eventYear.calendarYear)) {
      return false;
    }
  }

  if (filters.parks.length > 0) {
    if (!filters.parks.some((facet) => matchesParkFacet(attraction.parkIds, facet))) {
      return false;
    }
  }

  if (filters.ipTypes.length > 0) {
    if (!attraction.ipType || !filters.ipTypes.includes(attraction.ipType)) {
      return false;
    }
  }

  if (filters.rated.length > 0) {
    const isRated = rating !== null;
    const matches = filters.rated.some((state) => (state === "rated" ? isRated : !isRated));
    if (!matches) {
      return false;
    }
  }

  if (isRatingRangeActive(filters)) {
    if (!rating || rating.total < filters.ratingMin || rating.total > filters.ratingMax) {
      return false;
    }
  }

  return true;
}

export type SortDirection = "asc" | "desc";

export type SortOption =
  | "name-asc"
  | "name-desc"
  | "year-desc"
  | "year-asc"
  | "total-desc"
  | "total-asc"
  | "theme-desc"
  | "theme-asc"
  | "fun-desc"
  | "fun-asc"
  | "fear-desc"
  | "fear-asc"
  | "manual";

export const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "name-asc", label: "Name (A–Z)" },
  { value: "name-desc", label: "Name (Z–A)" },
  { value: "year-desc", label: "Year (Newest)" },
  { value: "year-asc", label: "Year (Oldest)" },
  { value: "total-desc", label: "Total (Highest)" },
  { value: "total-asc", label: "Total (Lowest)" },
  { value: "theme-desc", label: "Theme (Highest)" },
  { value: "theme-asc", label: "Theme (Lowest)" },
  { value: "fun-desc", label: "Fun (Highest)" },
  { value: "fun-asc", label: "Fun (Lowest)" },
  { value: "fear-desc", label: "Fear (Highest)" },
  { value: "fear-asc", label: "Fear (Lowest)" },
  { value: "manual", label: "Personal Ranking" },
];

export const DEFAULT_SORT: SortOption = "name-asc";

/**
 * Compares two possibly-absent numeric values. Whichever side is `null`
 * always sorts after the other, regardless of direction — an unrated
 * attraction (or one with no manual ranking position) is never treated as
 * a 0 or otherwise forced into a specific end of the list by accident.
 */
function compareNullable(a: number | null, b: number | null, direction: SortDirection): number {
  if (a === null && b === null) {
    return 0;
  }
  if (a === null) {
    return 1;
  }
  if (b === null) {
    return -1;
  }
  return direction === "asc" ? a - b : b - a;
}

function comparePrimary(
  a: AttractionBrowserRow,
  b: AttractionBrowserRow,
  sort: SortOption,
): number {
  switch (sort) {
    case "name-asc":
      return a.attraction.name.localeCompare(b.attraction.name);
    case "name-desc":
      return b.attraction.name.localeCompare(a.attraction.name);
    case "year-desc":
      return compareNullable(
        a.eventYear?.calendarYear ?? null,
        b.eventYear?.calendarYear ?? null,
        "desc",
      );
    case "year-asc":
      return compareNullable(
        a.eventYear?.calendarYear ?? null,
        b.eventYear?.calendarYear ?? null,
        "asc",
      );
    case "total-desc":
      return compareNullable(a.rating?.total ?? null, b.rating?.total ?? null, "desc");
    case "total-asc":
      return compareNullable(a.rating?.total ?? null, b.rating?.total ?? null, "asc");
    case "theme-desc":
      return compareNullable(a.rating?.theme ?? null, b.rating?.theme ?? null, "desc");
    case "theme-asc":
      return compareNullable(a.rating?.theme ?? null, b.rating?.theme ?? null, "asc");
    case "fun-desc":
      return compareNullable(a.rating?.fun ?? null, b.rating?.fun ?? null, "desc");
    case "fun-asc":
      return compareNullable(a.rating?.fun ?? null, b.rating?.fun ?? null, "asc");
    case "fear-desc":
      return compareNullable(a.rating?.fear ?? null, b.rating?.fear ?? null, "desc");
    case "fear-asc":
      return compareNullable(a.rating?.fear ?? null, b.rating?.fear ?? null, "asc");
    case "manual":
      return compareNullable(a.rankingPosition, b.rankingPosition, "asc");
    default:
      return 0;
  }
}

/** Sorts with a stable, sensible fallback: ties (including "both unrated") break by name. */
export function compareAttractionRows(
  a: AttractionBrowserRow,
  b: AttractionBrowserRow,
  sort: SortOption,
): number {
  const primary = comparePrimary(a, b, sort);
  if (primary !== 0 || sort === "name-asc" || sort === "name-desc") {
    return primary;
  }
  return a.attraction.name.localeCompare(b.attraction.name);
}

export function filterAndSortRows(
  rows: AttractionBrowserRow[],
  filters: AttractionBrowserFilters,
  sort: SortOption,
): AttractionBrowserRow[] {
  return rows
    .filter((row) => matchesQuery(row, filters.query) && matchesFilters(row, filters))
    .slice()
    .sort((a, b) => compareAttractionRows(a, b, sort));
}
