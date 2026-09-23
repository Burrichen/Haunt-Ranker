import type { AttractionType, IpType } from "../models/attraction";
import { RANKING_HAUNT_SCOPES, type RankingGroup, type RankingHauntScope } from "../models/ranking";
import type { ParkFacet } from "./attractionBrowser";
import {
  DEFAULT_RANKING_FILTERS,
  DEFAULT_RANKING_SORT,
  RANKING_DIRECTIONS,
  RANKING_METRICS,
  type RankingDirection,
  type RankingFilters,
  type RankingMetric,
  type RankingMode,
  type RankingSort,
} from "./rankings";

const GROUPS: readonly RankingGroup[] = ["houses", "scare_zones", "all"];
const MODES: readonly RankingMode[] = ["calculated", "manual"];
const PARK_FACETS: readonly ParkFacet[] = ["hollywood", "orlando", "both"];
const IP_TYPES: readonly IpType[] = ["original", "licensed"];
const ATTRACTION_TYPES: readonly AttractionType[] = ["house", "scare_zone"];

export const DEFAULT_RANKING_GROUP: RankingGroup = "houses";
export const DEFAULT_RANKING_HAUNT: RankingHauntScope = "all";

function parseOne<T extends string>(raw: string | null, allowed: readonly T[]): T | null {
  return raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : null;
}

function parseStringList<T extends string>(raw: string | null, allowed: readonly T[]): T[] {
  if (!raw) {
    return [];
  }
  const permitted = new Set<string>(allowed);
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter((part): part is T => permitted.has(part));
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

export interface RankingsParams {
  group: RankingGroup;
  /** Which haunt's list this is — or All Haunts, a list in its own right. */
  haunt: RankingHauntScope;
  /**
   * `null` means the URL doesn't pin a mode, so the page picks the default:
   * manual whenever a saved manual ranking exists for the group, since the
   * user's own order takes precedence over the calculated one.
   */
  mode: RankingMode | null;
  filters: RankingFilters;
  sort: RankingSort;
}

export function parseRankingsParams(params: URLSearchParams): RankingsParams {
  const metric = parseOne<RankingMetric>(params.get("metric"), RANKING_METRICS);
  const direction = parseOne<RankingDirection>(params.get("dir"), RANKING_DIRECTIONS);

  return {
    group: parseOne<RankingGroup>(params.get("group"), GROUPS) ?? DEFAULT_RANKING_GROUP,
    haunt:
      parseOne<RankingHauntScope>(params.get("haunt"), RANKING_HAUNT_SCOPES) ??
      DEFAULT_RANKING_HAUNT,
    mode: parseOne<RankingMode>(params.get("mode"), MODES),
    filters: {
      years: parseYearList(params.get("year")),
      types: parseStringList(params.get("type"), ATTRACTION_TYPES),
      parks: parseStringList(params.get("park"), PARK_FACETS),
      ipTypes: parseStringList(params.get("ip"), IP_TYPES),
    },
    sort: {
      metric: metric ?? DEFAULT_RANKING_SORT.metric,
      direction: direction ?? DEFAULT_RANKING_SORT.direction,
    },
  };
}

/** The inverse — only writes what differs from the defaults, for tidy URLs. */
export function rankingsParamsToSearchParams({
  group,
  haunt,
  mode,
  filters,
  sort,
}: RankingsParams): URLSearchParams {
  const params = new URLSearchParams();

  if (group !== DEFAULT_RANKING_GROUP) {
    params.set("group", group);
  }
  if (haunt !== DEFAULT_RANKING_HAUNT) {
    params.set("haunt", haunt);
  }
  if (mode) {
    params.set("mode", mode);
  }
  if (filters.years.length > 0) {
    params.set("year", filters.years.join(","));
  }
  if (filters.types.length > 0) {
    params.set("type", filters.types.join(","));
  }
  if (filters.parks.length > 0) {
    params.set("park", filters.parks.join(","));
  }
  if (filters.ipTypes.length > 0) {
    params.set("ip", filters.ipTypes.join(","));
  }
  if (sort.metric !== DEFAULT_RANKING_SORT.metric) {
    params.set("metric", sort.metric);
  }
  if (sort.direction !== DEFAULT_RANKING_SORT.direction) {
    params.set("dir", sort.direction);
  }

  return params;
}

export const DEFAULT_RANKINGS_PARAMS: RankingsParams = {
  group: DEFAULT_RANKING_GROUP,
  haunt: DEFAULT_RANKING_HAUNT,
  mode: null,
  filters: DEFAULT_RANKING_FILTERS,
  sort: DEFAULT_RANKING_SORT,
};
