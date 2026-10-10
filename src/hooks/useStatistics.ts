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
  compareHaunts,
  computeYearPerformance,
  computeDebutsByYear,
  TOP_ATTRACTIONS_LIMIT,
  type DebutCount,
  DEFAULT_STATISTICS_FILTERS,
  filterStatisticsRows,
  type Coverage,
  type HauntComparisonRow,
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
import { useHauntRegistry } from "./useHauntRegistry";
import { useHauntScope } from "./useHauntScope";
import { HAUNT_IDS, type HauntId } from "../models/haunt";

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
  /** The haunts side by side — only meaningful, and only shown, under All Haunts. */
  hauntComparison: HauntComparisonRow[];
  topAttractions: TopAttraction[];
  /** The same list from the other end — purely by score, whichever haunt. */
  bottomAttractions: TopAttraction[];
  /** New debuts per year, for each haunt in view that records debut years (Knott's). */
  debuts: Array<{ hauntId: HauntId; counts: DebutCount[] }>;
  /** How many attractions the current slice contains at all, reviewed or not. */
  attractionCount: number;
}

const EMPTY_COVERAGE: Coverage = {
  all: { reviewed: 0, total: 0 },
  houses: { reviewed: 0, total: 0 },
  byHaunt: [],
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
  const { haunts: registryHaunts } = useHauntRegistry();
  const { hauntId: scopeHauntId } = useHauntScope();
  const hauntIds = useMemo(() => registryHaunts.map((haunt) => haunt.id), [registryHaunts]);
  // A haunt that records an archive-coverage note holds only part of each
  // season's line-up, so its yearly averages are flagged as partial.
  const partialHaunts = useMemo(
    () => new Set(registryHaunts.filter((haunt) => haunt.archiveCoverage).map((haunt) => haunt.id)),
    [registryHaunts],
  );

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

  // Hollywood and Orlando are HHN's venues: the venue filter only applies
  // while HHN is in view, so a choice made there can't silently narrow
  // Knott's or All Haunts.
  const effectiveFilters = useMemo(
    () => (scopeHauntId === HAUNT_IDS.hhn ? filters : { ...filters, park: null }),
    [filters, scopeHauntId],
  );
  const visibleRows = useMemo(
    () => filterStatisticsRows(data.rows, effectiveFilters),
    [data.rows, effectiveFilters],
  );

  const highlights = useMemo(
    () => computeHighlights(visibleRows, highlightMode),
    [visibleRows, highlightMode],
  );
  const yearPerformance = useMemo(
    () =>
      computeYearPerformance(visibleRows, metric, { partialHaunts, year: effectiveFilters.year }),
    [visibleRows, metric, partialHaunts, effectiveFilters.year],
  );
  const distribution = useMemo(() => computeScoreDistribution(visibleRows), [visibleRows]);
  const coverage = useMemo(
    () => (visibleRows.length === 0 ? EMPTY_COVERAGE : computeCoverage(visibleRows, hauntIds)),
    [visibleRows, hauntIds],
  );
  const topAttractions = useMemo(
    () => computeTopAttractions(visibleRows, metric),
    [visibleRows, metric],
  );
  const bottomAttractions = useMemo(
    () => computeTopAttractions(visibleRows, metric, TOP_ATTRACTIONS_LIMIT, "asc"),
    [visibleRows, metric],
  );
  // Debuts are counted over the haunt's whole archive in view, not the
  // season filter: "new in 2023" doesn't change because 2025 is selected.
  const debuts = useMemo(() => {
    const rows = filterStatisticsRows(data.rows, { ...effectiveFilters, year: null });
    return hauntIds
      .map((hauntId) => ({ hauntId, counts: computeDebutsByYear(rows, hauntId) }))
      .filter((entry) => entry.counts.length > 0);
  }, [data.rows, effectiveFilters, hauntIds]);
  const hauntComparison = useMemo(
    () =>
      compareHaunts(
        visibleRows,
        registryHaunts.map((haunt) => haunt.id),
      ),
    [visibleRows, registryHaunts],
  );
  const availableYears = useMemo(() => computeAvailableYears(data.rows), [data.rows]);

  return {
    isLoading: data.isLoading,
    error: data.error,
    filters,
    setFilters,
    clearFilters,
    areFiltersActive: areStatisticsFiltersActive(effectiveFilters),
    availableYears,
    metric,
    setMetric,
    highlightMode,
    setHighlightMode,
    highlights,
    yearPerformance,
    distribution,
    coverage,
    hauntComparison,
    topAttractions,
    bottomAttractions,
    debuts,
    attractionCount: visibleRows.length,
  };
}
