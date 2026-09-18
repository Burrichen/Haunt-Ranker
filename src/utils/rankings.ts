import type { Attraction, AttractionType, IpType } from "../models/attraction";
import type { EntityId } from "../models/common";
import type { EventYear } from "../models/eventYear";
import type { Rating } from "../models/rating";
import type { RankingGroup } from "../models/ranking";
import { matchesParkFacet, type ParkFacet } from "./attractionBrowser";

/** One rankable attraction. `rating: null` means unrated — never a score of 0. */
export interface RankingRow {
  attraction: Attraction;
  eventYear: EventYear | null;
  rating: Rating | null;
}

/**
 * `calculated` orders by score; `manual` is the user's own saved order and
 * always wins while it's the active mode — a later score change can reorder
 * the calculated view, never the manual one.
 */
export type RankingMode = "calculated" | "manual";

/** The only metrics a ranking sorts by — the three rated dimensions and their total. No invented criteria. */
export type RankingMetric = "total" | "theme" | "fun" | "fear";
export type RankingDirection = "desc" | "asc";

export interface RankingSort {
  metric: RankingMetric;
  direction: RankingDirection;
}

export const DEFAULT_RANKING_SORT: RankingSort = { metric: "total", direction: "desc" };

export const RANKING_METRICS: readonly RankingMetric[] = ["total", "theme", "fun", "fear"];
export const RANKING_DIRECTIONS: readonly RankingDirection[] = ["desc", "asc"];

const METRIC_LABEL: Record<RankingMetric, string> = {
  total: "Total",
  theme: "Theme",
  fun: "Fun",
  fear: "Fear",
};

export function rankingSortLabel({ metric, direction }: RankingSort): string {
  return `${METRIC_LABEL[metric]} ${direction === "desc" ? "high → low" : "low → high"}`;
}

export interface RankingFilters {
  years: number[];
  /** Only meaningful for the "all" group; the single-type groups filter by type already. */
  types: AttractionType[];
  parks: ParkFacet[];
  ipTypes: IpType[];
}

export const DEFAULT_RANKING_FILTERS: RankingFilters = {
  years: [],
  types: [],
  parks: [],
  ipTypes: [],
};

export function areRankingFiltersActive(filters: RankingFilters): boolean {
  return (
    filters.years.length > 0 ||
    filters.types.length > 0 ||
    filters.parks.length > 0 ||
    filters.ipTypes.length > 0
  );
}

/** Which attraction types belong to a group at all, before any user filtering. */
export function groupAttractionTypes(group: RankingGroup): AttractionType[] {
  switch (group) {
    case "houses":
      return ["house"];
    case "scare_zones":
      return ["scare_zone"];
    case "all":
      return ["house", "scare_zone"];
  }
}

export function matchesRankingFilters(row: RankingRow, filters: RankingFilters): boolean {
  const { attraction, eventYear } = row;

  if (filters.years.length > 0) {
    if (eventYear === null || !filters.years.includes(eventYear.calendarYear)) {
      return false;
    }
  }

  if (filters.types.length > 0 && !filters.types.includes(attraction.attractionType)) {
    return false;
  }

  if (
    filters.parks.length > 0 &&
    !filters.parks.some((facet) => matchesParkFacet(attraction.parkIds, facet))
  ) {
    return false;
  }

  if (filters.ipTypes.length > 0) {
    if (!attraction.ipType || !filters.ipTypes.includes(attraction.ipType)) {
      return false;
    }
  }

  return true;
}

function metricValue(rating: Rating, metric: RankingMetric): number {
  return rating[metric];
}

/**
 * Orders two rated rows by the chosen metric. Ties fall back to name A–Z so
 * the list is stable and reproducible rather than dependent on load order —
 * that's determinism, not an extra rating criterion.
 */
export function compareByMetric(a: RankingRow, b: RankingRow, sort: RankingSort): number {
  // Only ever called on rows that have a rating; unrated rows are separated
  // out before sorting rather than being scored as 0.
  if (!a.rating || !b.rating) {
    return 0;
  }
  const left = metricValue(a.rating, sort.metric);
  const right = metricValue(b.rating, sort.metric);
  const difference = sort.direction === "desc" ? right - left : left - right;
  if (difference !== 0) {
    return difference;
  }
  return a.attraction.name.localeCompare(b.attraction.name);
}

export interface CalculatedRanking {
  /** Rated rows in score order — the ranking proper. */
  ranked: RankingRow[];
  /** Kept entirely out of the ranking rather than being treated as zero. */
  unrated: RankingRow[];
}

export function buildCalculatedRanking(
  rows: RankingRow[],
  sort: RankingSort = DEFAULT_RANKING_SORT,
): CalculatedRanking {
  const ranked = rows.filter((row) => row.rating !== null);
  const unrated = rows.filter((row) => row.rating === null);

  return {
    ranked: ranked.slice().sort((a, b) => compareByMetric(a, b, sort)),
    unrated: unrated.slice().sort((a, b) => a.attraction.name.localeCompare(b.attraction.name)),
  };
}

export interface ManualRanking {
  /** Rows the user has placed, in their saved order. */
  ranked: RankingRow[];
  /** Rated rows with no saved position yet — listed separately instead of being silently appended. */
  unplaced: RankingRow[];
  /** Unrated and unplaced. */
  unrated: RankingRow[];
}

/**
 * Lays rows out against a saved manual order.
 *
 * Saved positions are authoritative: a row the user placed keeps its spot
 * even if its score later changes, or if it loses its rating entirely.
 * Anything not in the saved order is surfaced separately rather than being
 * quietly appended to the ranking, so a newly-rated attraction never looks
 * like the user deliberately ranked it last.
 */
export function buildManualRanking(
  rows: RankingRow[],
  orderedIds: EntityId[],
  sort: RankingSort = DEFAULT_RANKING_SORT,
): ManualRanking {
  const byId = new Map(rows.map((row) => [row.attraction.id, row]));
  const placed = new Set<EntityId>();

  const ranked: RankingRow[] = [];
  for (const id of orderedIds) {
    const row = byId.get(id);
    // Ids that no longer resolve (deleted, or filtered out of this view) are
    // simply skipped — the saved order itself is left untouched.
    if (row) {
      ranked.push(row);
      placed.add(id);
    }
  }

  const remaining = rows.filter((row) => !placed.has(row.attraction.id));
  const { ranked: unplaced, unrated } = buildCalculatedRanking(remaining, sort);

  return { ranked, unplaced, unrated };
}

/** Moves one item within an array, returning a new array. */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items;
  }
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * Writes a reordering of the *visible* rows back into the full saved order.
 *
 * The user can reorder while filters hide part of their ranking, so the
 * visible rows are dropped back into the slots they already occupied,
 * leaving every hidden row's absolute position untouched. Saving only the
 * visible ids instead would silently delete the rest of the ranking.
 */
export function applyVisibleOrder(fullOrder: EntityId[], reorderedVisible: EntityId[]): EntityId[] {
  const known = new Set(fullOrder);
  const visible = new Set(reorderedVisible);

  const next = fullOrder.slice();
  const slots: number[] = [];
  next.forEach((id, index) => {
    if (visible.has(id)) {
      slots.push(index);
    }
  });

  const placeable = reorderedVisible.filter((id) => known.has(id));
  placeable.forEach((id, index) => {
    next[slots[index]] = id;
  });

  const additions = reorderedVisible.filter((id) => !known.has(id));
  return [...next, ...additions];
}
