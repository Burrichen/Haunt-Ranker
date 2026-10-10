import type { Attraction, IpType } from "../models/attraction";
import type { EntityId } from "../models/common";
import type { EventYear } from "../models/eventYear";
import type { HauntId } from "../models/haunt";
import type { ParkId } from "../models/park";
import type { Rating } from "../models/rating";
import { RATING_TOTAL_MAX } from "../models/rating";
import { MIN_REVIEWED_FOR_STATS } from "./years";
import { pickExtreme, ratedOnly, type AttractionExtreme } from "./attractionMetrics";
import type { RankingMetric } from "./rankings";

/** One attraction the dashboard can count. `rating: null` means unrated — never a zero. */
export interface StatisticsRow {
  attraction: Attraction;
  /** The season the record belongs to — for a Knott's maze, its debut season. */
  eventYear: EventYear | null;
  rating: Rating | null;
  /**
   * Every season it is verified to have run in, its own included. A
   * returning Knott's maze has several; an HHN house has one. Absent means
   * "its own season only".
   */
  appearances?: EventYear[];
}

/** The seasons a row ran in: its recorded appearances, or its own season. */
export function seasonsOf(row: StatisticsRow): EventYear[] {
  if (row.appearances && row.appearances.length > 0) {
    return row.appearances;
  }
  return row.eventYear ? [row.eventYear] : [];
}

/** Every facet is single-select, `null` meaning "no restriction" — a dashboard slice, not a query builder. */
export interface StatisticsFilters {
  year: number | null;
  park: ParkId | null;
  ipType: IpType | null;
}

export const DEFAULT_STATISTICS_FILTERS: StatisticsFilters = {
  year: null,
  park: null,
  ipType: null,
};

export function areStatisticsFiltersActive(filters: StatisticsFilters): boolean {
  return filters.year !== null || filters.park !== null || filters.ipType !== null;
}

export function matchesStatisticsFilters(row: StatisticsRow, filters: StatisticsFilters): boolean {
  // A season filter means "ran that season", not "debuted that season": a
  // maze back for its third year is part of that year's line-up.
  if (
    filters.year !== null &&
    !seasonsOf(row).some((season) => season.calendarYear === filters.year)
  ) {
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
  /** Its season — under All Haunts, the card names the haunt it came from. */
  eventYear: EventYear | null;
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
  const yearOf = new Map(rows.map((row) => [row.attraction.id, row.eventYear]));
  return HIGHLIGHT_METRICS.map((metric) => {
    const extreme = pickExtreme(rated, metric, direction);
    return {
      metric,
      label: HIGHLIGHT_LABELS[mode][metric],
      ...extreme,
      eventYear: yearOf.get(extreme.attraction.id) ?? null,
    };
  });
}

export interface YearPerformancePoint {
  calendarYear: number;
  /** Whose season it is — in an All Haunts slice, each haunt is its own series. */
  hauntId: string;
  /** The event year's id, so a row can link through to its page. */
  eventYearId: EntityId;
  /** The event's own name, for the tooltip — the axis carries the bare year. */
  label: string;
  average: number;
  /** The sample size behind the average, so the tooltip can qualify it. */
  reviewedCount: number;
  /**
   * The haunt's archive holds only part of this season's line-up (Knott's:
   * the mazes that debuted 2021–2026, not the older ones still running), so
   * the average is of what's archived, not of the whole event.
   */
  partial: boolean;
}

export interface YearPerformanceOptions {
  /** Haunts whose archive covers only part of each season's line-up. */
  partialHaunts?: ReadonlySet<string>;
  /** Only this calendar year — when the page is filtered to one season. */
  year?: number | null;
}

/**
 * Average of one metric per event year — per season, so an All Haunts
 * slice keeps HHN 2024 and Knott's 2024 apart rather than averaging them
 * into one point under whichever name came first.
 *
 * Years with nothing reviewed are left out entirely rather than plotted at
 * zero — a flat line along the axis would read as "this year scored nothing"
 * when the truth is "nobody has reviewed it".
 */
export function computeYearPerformance(
  rows: StatisticsRow[],
  metric: RankingMetric,
  { partialHaunts = new Set<string>(), year = null }: YearPerformanceOptions = {},
): YearPerformancePoint[] {
  const bySeason = new Map<EntityId, { season: EventYear; values: number[] }>();

  for (const row of rows) {
    if (!row.rating) {
      continue;
    }
    // Every season it ran in: a reviewed returning maze counts toward each
    // line-up it was verified to be part of.
    for (const season of seasonsOf(row)) {
      if (year !== null && season.calendarYear !== year) {
        continue;
      }
      const entry = bySeason.get(season.id) ?? { season, values: [] };
      entry.values.push(row.rating[metric]);
      bySeason.set(season.id, entry);
    }
  }

  return Array.from(bySeason.values())
    .map(({ season, values }) => ({
      calendarYear: season.calendarYear,
      hauntId: season.hauntId,
      eventYearId: season.id,
      label: season.name,
      average: values.reduce((sum, value) => sum + value, 0) / values.length,
      reviewedCount: values.length,
      partial: partialHaunts.has(season.hauntId),
    }))
    .sort((a, b) => a.calendarYear - b.calendarYear || (a.hauntId < b.hauntId ? -1 : 1));
}

/** How many records debuted in each year, for one haunt — never "the line-up that year". */
export interface DebutCount {
  year: number;
  count: number;
}

/**
 * New debuts per year from researched debut years. Years between the first
 * and last debut with none are kept as zero so the bars stay evenly spaced;
 * a record with no known debut year isn't counted anywhere.
 */
export function computeDebutsByYear(rows: StatisticsRow[], hauntId: HauntId): DebutCount[] {
  const counts = new Map<number, number>();
  for (const row of rows) {
    const debut = row.attraction.debutYear;
    if (row.eventYear?.hauntId === hauntId && debut != null) {
      counts.set(debut, (counts.get(debut) ?? 0) + 1);
    }
  }
  if (counts.size === 0) {
    return [];
  }
  const years = [...counts.keys()];
  const result: DebutCount[] = [];
  for (let year = Math.min(...years); year <= Math.max(...years); year += 1) {
    result.push({ year, count: counts.get(year) ?? 0 });
  }
  return result;
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
  /** Each haunt's own share, so All Haunts can show them apart as well as combined. */
  byHaunt: Array<CoverageSlice & { hauntId: HauntId }>;
}

function sliceFor(rows: StatisticsRow[]): CoverageSlice {
  return {
    reviewed: rows.filter((row) => row.rating !== null).length,
    total: rows.length,
  };
}

export function computeCoverage(rows: StatisticsRow[], hauntIds: HauntId[] = []): Coverage {
  return {
    all: sliceFor(rows),
    houses: sliceFor(rows.filter((row) => row.attraction.attractionType === "house")),
    byHaunt: hauntIds
      .map((hauntId) => ({
        hauntId,
        ...sliceFor(rows.filter((row) => row.eventYear?.hauntId === hauntId)),
      }))
      .filter((slice) => slice.total > 0),
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
  /** `desc` for the Top 10, `asc` for the Bottom 10. Purely by score — no haunt gets reserved places. */
  direction: "desc" | "asc" = "desc",
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
        return direction === "desc" ? b.value - a.value : a.value - b.value;
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

/** One haunt's reviewed averages, for the All Haunts comparison. */
export interface HauntComparisonRow {
  hauntId: HauntId;
  /** How many of this haunt's attractions in the current slice are reviewed. */
  reviewedCount: number;
  /** How many it holds in the slice at all, reviewed or not. */
  attractionCount: number;
  /** `null` below the threshold: too little reviewed to average honestly. */
  averages: { total: number; theme: number; fun: number; fear: number } | null;
}

/**
 * The haunts side by side, averaged over what has actually been reviewed.
 *
 * Every row carries its sample size, and a haunt with too little reviewed
 * gets no averages at all rather than a number that looks like a verdict.
 * Haunts reviewed to very different depths are not comparable, and this
 * is deliberately arranged so the reader can see that for themselves.
 */
export function compareHaunts(rows: StatisticsRow[], hauntIds: HauntId[]): HauntComparisonRow[] {
  return hauntIds.map((hauntId) => {
    const own = rows.filter((row) => row.eventYear?.hauntId === hauntId);
    const rated = ratedOnly(own);

    if (rated.length < MIN_REVIEWED_FOR_STATS) {
      return {
        hauntId,
        reviewedCount: rated.length,
        attractionCount: own.length,
        averages: null,
      };
    }

    const mean = (pick: (rating: Rating) => number) =>
      rated.reduce((sum, item) => sum + pick(item.rating), 0) / rated.length;

    return {
      hauntId,
      reviewedCount: rated.length,
      attractionCount: own.length,
      averages: {
        total: mean((rating) => rating.total),
        theme: mean((rating) => rating.theme),
        fun: mean((rating) => rating.fun),
        fear: mean((rating) => rating.fear),
      },
    };
  });
}
