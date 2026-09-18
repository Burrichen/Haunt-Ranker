import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { RankingDirection, RankingMetric } from "../utils/rankings";
import {
  areStatisticsFiltersActive,
  availableYears as computeAvailableYears,
  DEFAULT_STATISTICS_FILTERS,
  type StatisticsFilters,
} from "../utils/statistics";
import {
  runAttractionQuery,
  runYearQuery,
  type ExplorerAttractionResult,
  type ExplorerSubject,
  type ExplorerYearRow,
} from "../utils/statisticsExplorer";
import { parseStatisticsParams, statisticsParamsToSearchParams } from "../utils/statisticsParams";
import { useArchiveRows } from "./useArchiveRows";

export interface StatisticsExplorer {
  isLoading: boolean;
  error: string | null;

  subject: ExplorerSubject;
  setSubject: (subject: ExplorerSubject) => void;

  filters: StatisticsFilters;
  setFilters: (filters: StatisticsFilters) => void;
  clearFilters: () => void;
  areFiltersActive: boolean;
  availableYears: number[];

  metric: RankingMetric;
  setMetric: (metric: RankingMetric) => void;
  direction: RankingDirection;
  setDirection: (direction: RankingDirection) => void;

  reviewedOnly: boolean;
  setReviewedOnly: (reviewedOnly: boolean) => void;

  /** Populated when the subject is attractions. */
  attractionResult: ExplorerAttractionResult;
  /** Populated when the subject is years. */
  yearRows: ExplorerYearRow[];
}

const EMPTY_ATTRACTION_RESULT: ExplorerAttractionResult = {
  ranked: [],
  unrated: [],
  matchCount: 0,
};

/**
 * The generic query the explorer runs. Filters, metric, direction and subject
 * are all URL state and shared with the dashboard, so switching views keeps
 * the slice — and a particular question ("least scary houses of 2101") is a
 * link you can come back to.
 */
export function useStatisticsExplorer(): StatisticsExplorer {
  const [searchParams, setSearchParams] = useSearchParams();
  const data = useArchiveRows();

  const params = useMemo(() => parseStatisticsParams(searchParams), [searchParams]);
  const { filters, metric, direction, subject, reviewedOnly } = params;

  const updateParams = useCallback(
    (next: Partial<typeof params>) => {
      setSearchParams(statisticsParamsToSearchParams({ ...params, ...next }), { replace: true });
    },
    [params, setSearchParams],
  );

  const attractionResult = useMemo(
    () =>
      subject === "attractions"
        ? runAttractionQuery(data.rows, { filters, metric, direction, reviewedOnly })
        : EMPTY_ATTRACTION_RESULT,
    [subject, data.rows, filters, metric, direction, reviewedOnly],
  );

  const yearRows = useMemo(
    () => (subject === "years" ? runYearQuery(data.rows, filters, metric, direction) : []),
    [subject, data.rows, filters, metric, direction],
  );

  return {
    isLoading: data.isLoading,
    error: data.error,
    subject,
    setSubject: useCallback(
      (next: ExplorerSubject) => updateParams({ subject: next }),
      [updateParams],
    ),
    filters,
    setFilters: useCallback(
      (next: StatisticsFilters) => updateParams({ filters: next }),
      [updateParams],
    ),
    clearFilters: useCallback(
      () => updateParams({ filters: DEFAULT_STATISTICS_FILTERS }),
      [updateParams],
    ),
    areFiltersActive: areStatisticsFiltersActive(filters),
    availableYears: useMemo(() => computeAvailableYears(data.rows), [data.rows]),
    metric,
    setMetric: useCallback((next: RankingMetric) => updateParams({ metric: next }), [updateParams]),
    direction,
    setDirection: useCallback(
      (next: RankingDirection) => updateParams({ direction: next }),
      [updateParams],
    ),
    reviewedOnly,
    setReviewedOnly: useCallback(
      (next: boolean) => updateParams({ reviewedOnly: next }),
      [updateParams],
    ),
    attractionResult,
    yearRows,
  };
}
