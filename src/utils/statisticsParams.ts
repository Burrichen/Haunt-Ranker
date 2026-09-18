import type { AttractionType, IpType } from "../models/attraction";
import type { ParkId } from "../models/park";
import {
  RANKING_DIRECTIONS,
  RANKING_METRICS,
  type RankingDirection,
  type RankingMetric,
} from "./rankings";
import {
  DEFAULT_STATISTICS_FILTERS,
  type HighlightMode,
  type StatisticsFilters,
} from "./statistics";
import type { ExplorerSubject } from "./statisticsExplorer";

const ATTRACTION_TYPES: readonly AttractionType[] = ["house", "scare_zone"];
const PARK_IDS: readonly ParkId[] = ["hollywood", "orlando"];
const IP_TYPES: readonly IpType[] = ["original", "licensed"];
const HIGHLIGHT_MODES: readonly HighlightMode[] = ["best", "lowest"];
const VIEWS: readonly StatisticsView[] = ["dashboard", "explorer"];
const SUBJECTS: readonly ExplorerSubject[] = ["attractions", "years"];

/** The page shows either the curated dashboard or the generic explorer. */
export type StatisticsView = "dashboard" | "explorer";

export const DEFAULT_STATISTICS_METRIC: RankingMetric = "total";
export const DEFAULT_HIGHLIGHT_MODE: HighlightMode = "best";
export const DEFAULT_STATISTICS_VIEW: StatisticsView = "dashboard";
export const DEFAULT_EXPLORER_SUBJECT: ExplorerSubject = "attractions";
export const DEFAULT_EXPLORER_DIRECTION: RankingDirection = "desc";

export interface StatisticsParams {
  view: StatisticsView;
  /** Shared by both views, so switching keeps the slice you were looking at. */
  filters: StatisticsFilters;
  /** Drives the year chart, the Top 10 and the explorer's ranking alike. */
  metric: RankingMetric;
  highlightMode: HighlightMode;
  subject: ExplorerSubject;
  direction: RankingDirection;
  /** Explorer only: whether unrated matches are listed at all. */
  reviewedOnly: boolean;
}

export const DEFAULT_STATISTICS_PARAMS: StatisticsParams = {
  view: DEFAULT_STATISTICS_VIEW,
  filters: DEFAULT_STATISTICS_FILTERS,
  metric: DEFAULT_STATISTICS_METRIC,
  highlightMode: DEFAULT_HIGHLIGHT_MODE,
  subject: DEFAULT_EXPLORER_SUBJECT,
  direction: DEFAULT_EXPLORER_DIRECTION,
  // Ranking questions are about reviewed entries; seeing what's missing is opt-in.
  reviewedOnly: true,
};

function parseOne<T extends string>(raw: string | null, allowed: readonly T[]): T | null {
  return raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : null;
}

function parseYear(raw: string | null): number | null {
  if (!raw) {
    return null;
  }
  const year = Number(raw);
  return Number.isFinite(year) ? year : null;
}

export function parseStatisticsParams(params: URLSearchParams): StatisticsParams {
  return {
    view: parseOne<StatisticsView>(params.get("view"), VIEWS) ?? DEFAULT_STATISTICS_VIEW,
    filters: {
      year: parseYear(params.get("year")),
      type: parseOne<AttractionType>(params.get("type"), ATTRACTION_TYPES),
      park: parseOne<ParkId>(params.get("park"), PARK_IDS),
      ipType: parseOne<IpType>(params.get("ip"), IP_TYPES),
    },
    metric:
      parseOne<RankingMetric>(params.get("metric"), RANKING_METRICS) ?? DEFAULT_STATISTICS_METRIC,
    highlightMode:
      parseOne<HighlightMode>(params.get("highlight"), HIGHLIGHT_MODES) ?? DEFAULT_HIGHLIGHT_MODE,
    subject: parseOne<ExplorerSubject>(params.get("subject"), SUBJECTS) ?? DEFAULT_EXPLORER_SUBJECT,
    direction:
      parseOne<RankingDirection>(params.get("dir"), RANKING_DIRECTIONS) ??
      DEFAULT_EXPLORER_DIRECTION,
    reviewedOnly: params.get("unrated") !== "show",
  };
}

/** The inverse — only writes what differs from the defaults, for tidy URLs. */
export function statisticsParamsToSearchParams({
  view,
  filters,
  metric,
  highlightMode,
  subject,
  direction,
  reviewedOnly,
}: StatisticsParams): URLSearchParams {
  const params = new URLSearchParams();

  if (view !== DEFAULT_STATISTICS_VIEW) {
    params.set("view", view);
  }
  if (subject !== DEFAULT_EXPLORER_SUBJECT) {
    params.set("subject", subject);
  }
  if (direction !== DEFAULT_EXPLORER_DIRECTION) {
    params.set("dir", direction);
  }
  if (!reviewedOnly) {
    params.set("unrated", "show");
  }
  if (filters.year !== null) {
    params.set("year", String(filters.year));
  }
  if (filters.type !== null) {
    params.set("type", filters.type);
  }
  if (filters.park !== null) {
    params.set("park", filters.park);
  }
  if (filters.ipType !== null) {
    params.set("ip", filters.ipType);
  }
  if (metric !== DEFAULT_STATISTICS_METRIC) {
    params.set("metric", metric);
  }
  if (highlightMode !== DEFAULT_HIGHLIGHT_MODE) {
    params.set("highlight", highlightMode);
  }

  return params;
}
