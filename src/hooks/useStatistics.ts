import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { RankingMetric } from "../utils/rankings";
import {
  areStatisticsFiltersActive,
  availableYears as computeAvailableYears,
  computeCoverage,
  computeHighlights,
  computeScoreDistribution,
  computeTopAttractions,
  computeYearPerformance,
  DEFAULT_STATISTICS_FILTERS,
  filterStatisticsRows,
  type Coverage,
  type DistributionBucket,
  type Highlight,
  type HighlightMode,
  type StatisticsFilters,
  type TopAttraction,
  type YearPerformancePoint,
} from "../utils/statistics";
import {
  parseStatisticsParams,
  statisticsParamsToSearchParams,
  type StatisticsView,
} from "../utils/statisticsParams";
import { useArchiveRows } from "./useArchiveRows";

/**
 * Just the dashboard/explorer switch, so the page shell can flip views
 * without mounting either view's data hook.
 */
export function useStatisticsView(): [StatisticsView, (view: StatisticsView) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(() => parseStatisticsParams(searchParams), [searchParams]);

  const setView = useCallback(
    (view: StatisticsView) => {
      setSearchParams(statisticsParamsToSearchParams({ ...params, view }), { replace: true });
    },
    [params, setSearchParams],
  );

  return [params.view, setView];
}

export interface Statistics {
  isLoading: boolean;
  error: string | null;

  filters: StatisticsFilters;
  setFilters: (filters: StatisticsFilters) => void;
  clearFilters: () => void;
  areFiltersActive: boolean;
  availableYears: number[];

  /** Shared by the year chart and the Top 10 so the dashboard never disagrees with itself. */
  metric: RankingMetric;
  setMetric: (metric: RankingMetric) => void;

  highlightMode: HighlightMode;
  setHighlightMode: (mode: HighlightMode) => void;

  /** Empty when nothing in the current slice is reviewed. */
  highlights: Highlight[];
  yearPerformance: YearPerformancePoint[];
  distribution: DistributionBucket[];
  coverage: Coverage;
  topAttractions: TopAttraction[];
  /** How many attractions the current slice contains at all, reviewed or not. */
  attractionCount: number;
}

const EMPTY_COVERAGE: Coverage = {
  all: { reviewed: 0, total: 0 },
  houses: { reviewed: 0, total: 0 },
  scareZones: { reviewed: 0, total: 0 },
};

/**
 * Loads the archive once and derives every dashboard figure from the same
 * filtered slice, so the highlight cards, charts, coverage and Top 10 can
 * never disagree about what they're describing. Filters, metric and
 * highlight mode live in the URL like the rest of the app.
 */
export function useStatistics(): Statistics {
  const [searchParams, setSearchParams] = useSearchParams();
  const data = useArchiveRows();

  const params = useMemo(() => parseStatisticsParams(searchParams), [searchParams]);
  const { filters, metric, highlightMode } = params;

  const updateParams = useCallback(
    (next: Partial<typeof params>) => {
      setSearchParams(statisticsParamsToSearchParams({ ...params, ...next }), { replace: true });
    },
    [params, setSearchParams],
  );

  const setFilters = useCallback(
    (nextFilters: StatisticsFilters) => updateParams({ filters: nextFilters }),
    [updateParams],
  );
  const clearFilters = useCallback(
    () => updateParams({ filters: DEFAULT_STATISTICS_FILTERS }),
    [updateParams],
  );
  const setMetric = useCallback(
    (nextMetric: RankingMetric) => updateParams({ metric: nextMetric }),
    [updateParams],
  );
  const setHighlightMode = useCallback(
    (mode: HighlightMode) => updateParams({ highlightMode: mode }),
    [updateParams],
  );

  const visibleRows = useMemo(() => filterStatisticsRows(data.rows, filters), [data.rows, filters]);

  const highlights = useMemo(
    () => computeHighlights(visibleRows, highlightMode),
    [visibleRows, highlightMode],
  );
  const yearPerformance = useMemo(
    () => computeYearPerformance(visibleRows, metric),
    [visibleRows, metric],
  );
  const distribution = useMemo(() => computeScoreDistribution(visibleRows), [visibleRows]);
  const coverage = useMemo(
    () => (visibleRows.length === 0 ? EMPTY_COVERAGE : computeCoverage(visibleRows)),
    [visibleRows],
  );
  const topAttractions = useMemo(
    () => computeTopAttractions(visibleRows, metric),
    [visibleRows, metric],
  );
  const availableYears = useMemo(() => computeAvailableYears(data.rows), [data.rows]);

  return {
    isLoading: data.isLoading,
    error: data.error,
    filters,
    setFilters,
    clearFilters,
    areFiltersActive: areStatisticsFiltersActive(filters),
    availableYears,
    metric,
    setMetric,
    highlightMode,
    setHighlightMode,
    highlights,
    yearPerformance,
    distribution,
    coverage,
    topAttractions,
    attractionCount: visibleRows.length,
  };
}
