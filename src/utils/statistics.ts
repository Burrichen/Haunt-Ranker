import type { Attraction, AttractionType, IpType } from "../models/attraction";
import type { EntityId } from "../models/common";
import type { EventYear } from "../models/eventYear";
import type { ParkId } from "../models/park";
import type { Rating } from "../models/rating";
import { RATING_TOTAL_MAX } from "../models/rating";
import { pickExtreme, ratedOnly, type AttractionExtreme } from "./attractionMetrics";
import type { RankingMetric } from "./rankings";

/** One attraction the dashboard can count. `rating: null` means unrated — never a zero. */
export interface StatisticsRow {
  attraction: Attraction;
  eventYear: EventYear | null;
  rating: Rating | null;
}

/** Every facet is single-select, `null` meaning "no restriction" — a dashboard slice, not a query builder. */
export interface StatisticsFilters {
  year: number | null;
  type: AttractionType | null;
  park: ParkId | null;
  ipType: IpType | null;
}

export const DEFAULT_STATISTICS_FILTERS: StatisticsFilters = {
  year: null,
  type: null,
  park: null,
  ipType: null,
};

export function areStatisticsFiltersActive(filters: StatisticsFilters): boolean {
  return (
    filters.year !== null ||
    filters.type !== null ||
    filters.park !== null ||
    filters.ipType !== null
  );
}

export function matchesStatisticsFilters(row: StatisticsRow, filters: StatisticsFilters): boolean {
  if (filters.year !== null && row.eventYear?.calendarYear !== filters.year) {
    return false;
  }
  if (filters.type !== null && row.attraction.attractionType !== filters.type) {
    return false;
  }
  if (filters.park !== null && !row.attraction.parkIds.includes(filters.park)) {
    return false;
  }
  if (filters.ipType !== null && row.attraction.ipType !== filters.ipType) {
    return false;
  }
  return true;
}

export function filterStatisticsRows(
  rows: StatisticsRow[],
  filters: StatisticsFilters,
): StatisticsRow[] {
  return rows.filter((row) => matchesStatisticsFilters(row, filters));
}

export type HighlightMode = "best" | "lowest";

export interface Highlight extends AttractionExtreme {
  metric: RankingMetric;
  label: string;
}

const HIGHLIGHT_LABELS: Record<HighlightMode, Record<RankingMetric, string>> = {
  best: {
    total: "Highest Rated",
    fear: "Scariest",
    fun: "Most Fun",
    theme: "Best Theme",
  },
  lowest: {
    total: "Lowest Rated",
    fear: "Least Scary",
    fun: "Least Fun",
    theme: "Lowest Theme",
  },
};

/** The order the cards read in — the headline metric first, then the three dimensions. */
const HIGHLIGHT_METRICS: readonly RankingMetric[] = ["total", "fear", "fun", "theme"];

/**
 * The four highlight cards. Reviewed entries only — an unrated attraction
 * can't be the least scary thing in the archive, it's simply unknown.
 * Returns an empty list when nothing in the current slice is reviewed, so
 * the UI can say that rather than render four blanks.
 */
export function computeHighlights(rows: StatisticsRow[], mode: HighlightMode): Highlight[] {
  const rated = ratedOnly(rows);
  if (rated.length === 0) {
    return [];
  }

  const direction = mode === "best" ? "desc" : "asc";
  return HIGHLIGHT_METRICS.map((metric) => ({
    metric,
    label: HIGHLIGHT_LABELS[mode][metric],
    ...pickExtreme(rated, metric, direction),
  }));
}

export interface YearPerformancePoint {
  calendarYear: number;
  /** The event year's id, so a row can link through to its page. */
  eventYearId: EntityId;
  /** The event's own name, for the tooltip — the axis carries the bare year. */
  label: string;
  average: number;
  /** The sample size behind the average, so the tooltip can qualify it. */
  reviewedCount: number;
}

/**
 * Average of one metric per event year.
 *
 * Years with nothing reviewed are left out entirely rather than plotted at
 * zero — a flat line along the axis would read as "this year scored nothing"
 * when the truth is "nobody has reviewed it".
 */
export function computeYearPerformance(
  rows: StatisticsRow[],
  metric: RankingMetric,
): YearPerformancePoint[] {
  const byYear = new Map<number, { eventYearId: EntityId; label: string; values: number[] }>();

  for (const row of rows) {
    if (!row.rating || !row.eventYear) {
      continue;
    }
    const existing = byYear.get(row.eventYear.calendarYear) ?? {
      eventYearId: row.eventYear.id,
      label: row.eventYear.name,
      values: [],
    };
    existing.values.push(row.rating[metric]);
    byYear.set(row.eventYear.calendarYear, existing);
  }

  return Array.from(byYear.entries())
    .map(([calendarYear, { eventYearId, label, values }]) => ({
      calendarYear,
      eventYearId,
      label,
      average: values.reduce((sum, value) => sum + value, 0) / values.length,
      reviewedCount: values.length,
    }))
    .sort((a, b) => a.calendarYear - b.calendarYear);
}

export interface DistributionBucket {
  label: string;
  /** Inclusive lower bound. */
  min: number;
  /** Exclusive upper bound, except for the final bucket which includes 15. */
  max: number;
  count: number;
}

const BUCKET_SIZE = 3;

/**
 * Total scores grouped into five bands across the 0–15 range. Bands are
 * half-open (`min` inclusive, `max` exclusive) so a score lands in exactly
 * one, with the top band closing on 15 so a perfect score has a home.
 */
export function computeScoreDistribution(rows: StatisticsRow[]): DistributionBucket[] {
  const buckets: DistributionBucket[] = [];
  for (let min = 0; min < RATING_TOTAL_MAX; min += BUCKET_SIZE) {
    const max = min + BUCKET_SIZE;
    buckets.push({ label: `${min}–${max}`, min, max, count: 0 });
  }

  for (const { rating } of ratedOnly(rows)) {
    const index = Math.min(Math.floor(rating.total / BUCKET_SIZE), buckets.length - 1);
    buckets[index].count += 1;
  }

  return buckets;
}

export interface CoverageSlice {
  reviewed: number;
  total: number;
}

export interface Coverage {
  all: CoverageSlice;
  houses: CoverageSlice;
  scareZones: CoverageSlice;
}

function sliceFor(rows: StatisticsRow[]): CoverageSlice {
  return {
    reviewed: rows.filter((row) => row.rating !== null).length,
    total: rows.length,
  };
}

export function computeCoverage(rows: StatisticsRow[]): Coverage {
  return {
    all: sliceFor(rows),
    houses: sliceFor(rows.filter((row) => row.attraction.attractionType === "house")),
    scareZones: sliceFor(rows.filter((row) => row.attraction.attractionType === "scare_zone")),
  };
}

/** 0 when nothing is in scope, so a progress visual has something defined to draw. */
export function coveragePercent({ reviewed, total }: CoverageSlice): number {
  return total === 0 ? 0 : (reviewed / total) * 100;
}

export interface TopAttraction extends AttractionExtreme {
  eventYear: EventYear | null;
}

export const TOP_ATTRACTIONS_LIMIT = 10;

/**
 * The best reviewed attractions by the metric currently on screen. Ties
 * break by name for the same reason as everywhere else — a stable list
 * rather than one that reshuffles between renders.
 */
export function computeTopAttractions(
  rows: StatisticsRow[],
  metric: RankingMetric,
  limit: number = TOP_ATTRACTIONS_LIMIT,
): TopAttraction[] {
  const yearByAttraction = new Map(rows.map((row) => [row.attraction.id, row.eventYear]));

  return ratedOnly(rows)
    .map((item) => ({
      ...item,
      value: item.rating[metric],
      eventYear: yearByAttraction.get(item.attraction.id) ?? null,
    }))
    .sort((a, b) => {
      if (a.value !== b.value) {
        return b.value - a.value;
      }
      return a.attraction.name.localeCompare(b.attraction.name);
    })
    .slice(0, limit);
}

/** Every event year present in the data, newest first — for the year filter. */
export function availableYears(rows: StatisticsRow[]): number[] {
  const years = new Set<number>();
  for (const row of rows) {
    if (row.eventYear) {
      years.add(row.eventYear.calendarYear);
    }
  }
  return Array.from(years).sort((a, b) => b - a);
}
