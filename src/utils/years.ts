import type { Attraction } from "../models/attraction";
import type { EventYear } from "../models/eventYear";
import type { Rating } from "../models/rating";
import { pickExtreme, ratedOnly, type AttractionExtreme } from "./attractionMetrics";
import type { RankingDirection, RankingMetric } from "./rankings";

/** One attraction within a year, with its review if it has one. */
export interface YearAttraction {
  attraction: Attraction;
  /** `null` means genuinely unrated — never counted as a score of 0. */
  rating: Rating | null;
  posterUrl: string | null;
}

/**
 * The fewest reviewed attractions a year needs before its statistics mean
 * anything. With a single review there is nothing to average against and
 * the "highest" and "lowest" rated attraction are the same record, which
 * reads as a fact but isn't one.
 *
 * Deliberately a flat minimum rather than any kind of confidence weighting:
 * below it the app says it doesn't have enough data, above it the raw mean
 * is shown next to its sample size and the reader can judge for themselves.
 */
export const MIN_REVIEWED_FOR_STATS = 2;

export interface YearAverages {
  theme: number;
  fun: number;
  fear: number;
  total: number;
}

/** One "most/least X" pick, carrying the attraction so it can be linked and previewed. */
export type YearSuperlative = AttractionExtreme;

export type SuperlativeKey =
  | "highestRated"
  | "lowestRated"
  | "scariest"
  | "leastScary"
  | "mostFun"
  | "leastFun"
  | "bestTheme"
  | "lowestTheme";

export type YearSuperlatives = Record<SuperlativeKey, YearSuperlative>;

export interface YearStats {
  /** How many of the year's attractions have a review — the sample size behind everything else. */
  reviewedCount: number;
  attractionCount: number;
  /** `null` when there isn't enough reviewed data to state an average. */
  averages: YearAverages | null;
  /** `null` under the same condition — no invented picks. */
  superlatives: YearSuperlatives | null;
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Everything the app can honestly say about a year, computed from reviewed records only. */
export function computeYearStats(items: YearAttraction[]): YearStats {
  const rated = ratedOnly(items);

  if (rated.length < MIN_REVIEWED_FOR_STATS) {
    return {
      reviewedCount: rated.length,
      attractionCount: items.length,
      averages: null,
      superlatives: null,
    };
  }

  return {
    reviewedCount: rated.length,
    attractionCount: items.length,
    averages: {
      theme: mean(rated.map((item) => item.rating.theme)),
      fun: mean(rated.map((item) => item.rating.fun)),
      fear: mean(rated.map((item) => item.rating.fear)),
      total: mean(rated.map((item) => item.rating.total)),
    },
    superlatives: {
      highestRated: pickExtreme(rated, "total", "desc"),
      lowestRated: pickExtreme(rated, "total", "asc"),
      scariest: pickExtreme(rated, "fear", "desc"),
      leastScary: pickExtreme(rated, "fear", "asc"),
      mostFun: pickExtreme(rated, "fun", "desc"),
      leastFun: pickExtreme(rated, "fun", "asc"),
      bestTheme: pickExtreme(rated, "theme", "desc"),
      lowestTheme: pickExtreme(rated, "theme", "asc"),
    },
  };
}

export interface YearSummary {
  eventYear: EventYear;
  /** Real event artwork if the year has any on file — never a generated stand-in. */
  artworkUrl: string | null;
  houseCount: number;
  scareZoneCount: number;
  reviewedCount: number;
  attractionCount: number;
  /** `null` when the year hasn't enough reviews to average — see `MIN_REVIEWED_FOR_STATS`. */
  averages: YearAverages | null;
}

export function summarizeYear(
  eventYear: EventYear,
  items: YearAttraction[],
  artworkUrl: string | null,
): YearSummary {
  const stats = computeYearStats(items);

  return {
    eventYear,
    artworkUrl,
    houseCount: items.filter((item) => item.attraction.attractionType === "house").length,
    scareZoneCount: items.filter((item) => item.attraction.attractionType === "scare_zone").length,
    reviewedCount: stats.reviewedCount,
    attractionCount: stats.attractionCount,
    averages: stats.averages,
  };
}

export interface YearRankingSort {
  metric: RankingMetric;
  direction: RankingDirection;
}

export const DEFAULT_YEAR_SORT: YearRankingSort = { metric: "total", direction: "desc" };

export interface YearRanking {
  /** Years with enough reviews to rank, in the chosen order. */
  ranked: YearSummary[];
  /**
   * Years held back because too little of them has been reviewed. Listed
   * rather than hidden, and never mixed into the ranking where one review
   * would sit alongside a fully-reviewed year as if they were comparable.
   */
  insufficient: YearSummary[];
}

export function buildYearRanking(
  summaries: YearSummary[],
  sort: YearRankingSort = DEFAULT_YEAR_SORT,
): YearRanking {
  const ranked = summaries.filter((summary) => summary.averages !== null);
  const insufficient = summaries.filter((summary) => summary.averages === null);

  ranked.sort((a, b) => {
    // Both sides are guaranteed to have averages by the filter above.
    const left = a.averages?.[sort.metric] ?? 0;
    const right = b.averages?.[sort.metric] ?? 0;
    if (left !== right) {
      return sort.direction === "desc" ? right - left : left - right;
    }
    return b.eventYear.calendarYear - a.eventYear.calendarYear;
  });

  insufficient.sort((a, b) => b.eventYear.calendarYear - a.eventYear.calendarYear);

  return { ranked, insufficient };
}
