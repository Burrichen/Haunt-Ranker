import type { Attraction } from "../models/attraction";
import type { EventYear } from "../models/eventYear";
import type { Rating } from "../models/rating";
import { ratedOnly } from "./attractionMetrics";
import type { RankingDirection, RankingMetric } from "./rankings";
import {
  computeYearPerformance,
  filterStatisticsRows,
  type StatisticsFilters,
  type StatisticsRow,
} from "./statistics";

/** What a query ranks: individual attractions, or event years by their averages. */
export type ExplorerSubject = "attractions" | "years";

/**
 * One question, expressed generically.
 *
 * Every example the explorer is meant to answer — scariest attractions ever,
 * least scary houses, most fun Orlando attractions, best-scoring originals —
 * is this same struct with different values. Nothing is special-cased per
 * question.
 */
export interface ExplorerQuery {
  filters: StatisticsFilters;
  metric: RankingMetric;
  direction: RankingDirection;
  /** When false, matching attractions with no review are listed apart rather than dropped. */
  reviewedOnly: boolean;
}

export interface ExplorerAttractionRow {
  /** 1-based position in the answer. */
  rank: number;
  attraction: Attraction;
  eventYear: EventYear | null;
  rating: Rating;
  /** The value of the metric being ranked by. */
  value: number;
}

export interface ExplorerAttractionResult {
  ranked: ExplorerAttractionRow[];
  /**
   * Matches with no review. They can never be ranked — a missing score is not
   * a low one — so they're surfaced separately, and only when the user hasn't
   * asked for reviewed entries only.
   */
  unrated: StatisticsRow[];
  /** Everything the filters matched, reviewed or not. */
  matchCount: number;
}

/**
 * Ranks attractions by one metric within a filtered slice.
 *
 * Ties break by name so the answer is stable between renders rather than
 * dependent on load order.
 */
export function runAttractionQuery(
  rows: StatisticsRow[],
  { filters, metric, direction, reviewedOnly }: ExplorerQuery,
): ExplorerAttractionResult {
  const matches = filterStatisticsRows(rows, filters);
  const yearByAttraction = new Map(matches.map((row) => [row.attraction.id, row.eventYear]));

  const ranked = ratedOnly(matches)
    .map((item) => ({
      attraction: item.attraction,
      rating: item.rating,
      eventYear: yearByAttraction.get(item.attraction.id) ?? null,
      value: item.rating[metric],
    }))
    .sort((a, b) => {
      if (a.value !== b.value) {
        return direction === "desc" ? b.value - a.value : a.value - b.value;
      }
      return a.attraction.name.localeCompare(b.attraction.name);
    })
    .map((row, index) => ({ ...row, rank: index + 1 }));

  return {
    ranked,
    unrated: reviewedOnly ? [] : matches.filter((row) => row.rating === null),
    matchCount: matches.length,
  };
}

export interface ExplorerYearRow {
  rank: number;
  calendarYear: number;
  /** The event year's id, so the row can link through to its page. */
  eventYearId: string;
  /** The event's own name. */
  label: string;
  average: number;
  /** How many reviewed attractions the average is built from. */
  reviewedCount: number;
}

/**
 * Ranks event years by the average of one metric across their reviewed
 * attractions, within the same filtered slice — so "average fear of Hollywood
 * houses, by year" is just the year subject with two filters set.
 *
 * Every row carries the count behind its average. Unlike the Years page,
 * which withholds thin years from its ranking entirely, the explorer shows
 * them and states the sample size: it's the tool for looking at the raw
 * answer, with the number needed to judge it sitting in its own column.
 */
export function runYearQuery(
  rows: StatisticsRow[],
  filters: StatisticsFilters,
  metric: RankingMetric,
  direction: RankingDirection,
): ExplorerYearRow[] {
  const matches = filterStatisticsRows(rows, filters);

  return computeYearPerformance(matches, metric)
    .sort((a, b) => {
      if (a.average !== b.average) {
        return direction === "desc" ? b.average - a.average : a.average - b.average;
      }
      return b.calendarYear - a.calendarYear;
    })
    .map((point, index) => ({ ...point, rank: index + 1 }));
}
