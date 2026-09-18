import { CircleAlert } from "lucide-react";
import {
  ExplorerAttractionTable,
  ExplorerControls,
  ExplorerYearTable,
} from "../components/statistics";
import { EmptyState, LoadingState, Panel } from "../components/ui";
import { useStatisticsExplorer } from "../hooks/useStatisticsExplorer";
import "./StatisticsExplorer.css";

/**
 * The generic ranking tool behind the dashboard.
 *
 * Every question it's meant to answer — scariest attractions ever, least
 * scary houses, most fun Orlando attractions, best-scoring originals — is
 * the same query with different controls set, so none of them is built
 * separately and combinations nobody listed work just as well.
 */
export function StatisticsExplorer() {
  const {
    isLoading,
    error,
    subject,
    setSubject,
    filters,
    setFilters,
    clearFilters,
    areFiltersActive,
    availableYears,
    metric,
    setMetric,
    direction,
    setDirection,
    reviewedOnly,
    setReviewedOnly,
    attractionResult,
    yearRows,
  } = useStatisticsExplorer();

  return (
    <section className="explorer" aria-label="Stats Explorer">
      <ExplorerControls
        subject={subject}
        onSubjectChange={setSubject}
        filters={filters}
        onFiltersChange={setFilters}
        availableYears={availableYears}
        metric={metric}
        onMetricChange={setMetric}
        direction={direction}
        onDirectionChange={setDirection}
        reviewedOnly={reviewedOnly}
        onReviewedOnlyChange={setReviewedOnly}
        isActive={areFiltersActive}
        onClear={clearFilters}
      />

      {isLoading ? (
        <LoadingState label="Loading the archive…" />
      ) : error ? (
        <EmptyState
          icon={<CircleAlert size={24} />}
          title="Couldn't load the archive"
          description={error}
        />
      ) : (
        <Panel elevated padding="lg" className="explorer__results">
          {subject === "attractions" ? (
            <ExplorerAttractionTable result={attractionResult} metric={metric} />
          ) : (
            <ExplorerYearTable rows={yearRows} metric={metric} />
          )}
        </Panel>
      )}
    </section>
  );
}
