import type { IpType } from "../models/attraction";
import {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  RATING_RANGE_MAX,
  RATING_RANGE_MIN,
  SORT_OPTIONS,
  type AttractionBrowserFilters,
  type ParkFacet,
  type RatedFacet,
  type SortOption,
} from "./attractionBrowser";

const PARK_FACETS: readonly ParkFacet[] = ["hollywood", "orlando", "both"];
const IP_TYPES: readonly IpType[] = ["original", "licensed"];
const RATED_FACETS: readonly RatedFacet[] = ["rated", "unrated"];
const SORT_VALUES = new Set<string>(SORT_OPTIONS.map((option) => option.value));

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseStringList<T extends string>(raw: string | null, allowed: readonly T[]): T[] {
  if (!raw) {
    return [];
  }
  const seen = new Set(allowed);
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter((part): part is T => seen.has(part as T));
}

function parseYearList(raw: string | null): number[] {
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((year) => Number.isFinite(year));
}

/**
 * Reads filter/sort state out of the page's URL search params — the
 * single source of truth for this state, so navigating to an attraction
 * and back restores exactly where the user left off.
 */
export function parseAttractionBrowserParams(params: URLSearchParams): {
  filters: AttractionBrowserFilters;
  sort: SortOption;
} {
  const query = params.get("q") ?? "";
  const years = parseYearList(params.get("year"));
  const parks = parseStringList(params.get("park"), PARK_FACETS);
  const ipTypes = parseStringList(params.get("ip"), IP_TYPES);
  const rated = parseStringList(params.get("rated"), RATED_FACETS);

  const ratingMin = params.has("min")
    ? clamp(Number(params.get("min")), RATING_RANGE_MIN, RATING_RANGE_MAX)
    : DEFAULT_FILTERS.ratingMin;
  const ratingMax = params.has("max")
    ? clamp(Number(params.get("max")), RATING_RANGE_MIN, RATING_RANGE_MAX)
    : DEFAULT_FILTERS.ratingMax;

  const sortRaw = params.get("sort");
  const sort = sortRaw && SORT_VALUES.has(sortRaw) ? (sortRaw as SortOption) : DEFAULT_SORT;

  return {
    filters: {
      query,
      years,
      parks,
      ipTypes,
      rated,
      ratingMin: Number.isFinite(ratingMin) ? ratingMin : DEFAULT_FILTERS.ratingMin,
      ratingMax: Number.isFinite(ratingMax) ? ratingMax : DEFAULT_FILTERS.ratingMax,
    },
    sort,
  };
}

/** The inverse of `parseAttractionBrowserParams` — only writes params that differ from the defaults, for tidy URLs. */
export function attractionBrowserParamsToSearchParams(
  filters: AttractionBrowserFilters,
  sort: SortOption,
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.query.trim()) {
    params.set("q", filters.query);
  }
  if (filters.years.length > 0) {
    params.set("year", filters.years.join(","));
  }
  if (filters.parks.length > 0) {
    params.set("park", filters.parks.join(","));
  }
  if (filters.ipTypes.length > 0) {
    params.set("ip", filters.ipTypes.join(","));
  }
  if (filters.rated.length > 0) {
    params.set("rated", filters.rated.join(","));
  }
  if (filters.ratingMin > RATING_RANGE_MIN) {
    params.set("min", String(filters.ratingMin));
  }
  if (filters.ratingMax < RATING_RANGE_MAX) {
    params.set("max", String(filters.ratingMax));
  }
  if (sort !== DEFAULT_SORT) {
    params.set("sort", sort);
  }

  return params;
}
