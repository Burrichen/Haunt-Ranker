import { BarChart3, CircleAlert } from "lucide-react";
import {
  CoveragePanel,
  HauntComparison,
  HighlightCards,
  ScoreDistributionChart,
  StatisticsFilterBar,
  TopAttractionsList,
  YearPerformanceChart,
} from "../components/statistics";
import { EmptyState, LoadingState } from "../components/ui";
import { useHauntScope } from "../hooks/useHauntScope";
import { useStatistics } from "../hooks/useStatistics";
import "./Statistics.css";

/** The curated view: the handful of figures worth seeing without being asked for. */
export function StatisticsDashboard() {
  const {
    isLoading,
    error,
    filters,
    setFilters,
    clearFilters,
    areFiltersActive,
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
    attractionCount,
  } = useStatistics();
  const { isAllHaunts } = useHauntScope();

  if (isLoading) {
    return <LoadingState label="Loading statistics…" />;
  }

  if (error) {
    return (
      <EmptyState
        icon={<CircleAlert size={24} />}
        title="Couldn't load your statistics"
        description={error}
      />
    );
  }

  return (
    <div className="statistics__body">
      <StatisticsFilterBar
        filters={filters}
        onChange={setFilters}
        availableYears={availableYears}
        metric={metric}
        onMetricChange={setMetric}
        isActive={areFiltersActive}
        onClear={clearFilters}
      />

      {attractionCount === 0 ? (
        <EmptyState
          icon={<BarChart3 size={24} />}
          title={areFiltersActive ? "Nothing matches these filters" : "Nothing to measure yet"}
          description={
            areFiltersActive
              ? "No attractions match this combination — try widening it."
              : "Add attractions to the archive and rate them, and this page fills in."
          }
        />
      ) : (
        <>
          <HighlightCards
            highlights={highlights}
            mode={highlightMode}
            onModeChange={setHighlightMode}
          />

          <div className="statistics__charts">
            <YearPerformanceChart points={yearPerformance} metric={metric} />
            <ScoreDistributionChart buckets={distribution} reviewedCount={coverage.all.reviewed} />
          </div>

          {/* Only where the haunts are actually on screen together does
              comparing them mean anything. */}
          {isAllHaunts && <HauntComparison rows={hauntComparison} />}

          <div className="statistics__lower">
            <CoveragePanel coverage={coverage} />
            <TopAttractionsList attractions={topAttractions} metric={metric} />
          </div>
        </>
      )}
    </div>
  );
}
