import { X } from "lucide-react";
import type { RankingDirection, RankingMetric } from "../../utils/rankings";
import type { StatisticsFilters } from "../../utils/statistics";
import type { ExplorerSubject } from "../../utils/statisticsExplorer";
import { Button, FilterChip, SegmentedControl } from "../ui";
import { StatisticsFacets } from "./StatisticsFacets";
import "./StatisticsFilterBar.css";

export interface ExplorerControlsProps {
  subject: ExplorerSubject;
  onSubjectChange: (subject: ExplorerSubject) => void;
  filters: StatisticsFilters;
  onFiltersChange: (filters: StatisticsFilters) => void;
  availableYears: number[];
  metric: RankingMetric;
  onMetricChange: (metric: RankingMetric) => void;
  direction: RankingDirection;
  onDirectionChange: (direction: RankingDirection) => void;
  reviewedOnly: boolean;
  onReviewedOnlyChange: (reviewedOnly: boolean) => void;
  isActive: boolean;
  onClear: () => void;
}

const SUBJECT_OPTIONS = [
  { value: "attractions", label: "Attractions" },
  { value: "years", label: "Years" },
];

const METRIC_OPTIONS = [
  { value: "total", label: "Total" },
  { value: "theme", label: "Theme" },
  { value: "fun", label: "Fun" },
  { value: "fear", label: "Fear" },
];

const DIRECTION_OPTIONS = [
  { value: "desc", label: "Highest → Lowest" },
  { value: "asc", label: "Lowest → Highest" },
];

/**
 * The whole query in one row: what to rank, how to rank it, and what to
 * count. There is no per-question control here — "scariest scare zones of
 * 2103" is Fear + Highest→Lowest + two facets, assembled by the user.
 */
export function ExplorerControls({
  subject,
  onSubjectChange,
  filters,
  onFiltersChange,
  availableYears,
  metric,
  onMetricChange,
  direction,
  onDirectionChange,
  reviewedOnly,
  onReviewedOnlyChange,
  isActive,
  onClear,
}: ExplorerControlsProps) {
  return (
    <div className="statistics-filters">
      <div className="statistics-filters__group">
        <span className="statistics-filters__label">Rank</span>
        <SegmentedControl
          options={SUBJECT_OPTIONS}
          value={subject}
          onChange={(value) => onSubjectChange(value as ExplorerSubject)}
          aria-label="What to rank"
        />
      </div>

      <div className="statistics-filters__group">
        <span className="statistics-filters__label">Metric</span>
        <SegmentedControl
          options={METRIC_OPTIONS}
          value={metric}
          onChange={(value) => onMetricChange(value as RankingMetric)}
          aria-label="Metric"
        />
      </div>

      <div className="statistics-filters__group">
        <span className="statistics-filters__label">Direction</span>
        <SegmentedControl
          options={DIRECTION_OPTIONS}
          value={direction}
          onChange={(value) => onDirectionChange(value as RankingDirection)}
          aria-label="Direction"
        />
      </div>

      <StatisticsFacets
        filters={filters}
        onChange={onFiltersChange}
        availableYears={availableYears}
      />

      {/* A year's average is built from reviewed attractions by definition,
          so this only means anything when ranking attractions. */}
      {subject === "attractions" && (
        <div className="statistics-filters__group">
          <span className="statistics-filters__label">Unrated</span>
          <FilterChip
            active={!reviewedOnly}
            onClick={() => onReviewedOnlyChange(!reviewedOnly)}
            aria-label="Show unrated matches"
          >
            {reviewedOnly ? "Hidden" : "Shown"}
          </FilterChip>
        </div>
      )}

      {isActive && (
        <Button variant="ghost" size="sm" leadingIcon={<X size={14} />} onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
