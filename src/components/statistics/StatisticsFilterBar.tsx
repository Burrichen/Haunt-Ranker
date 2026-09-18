import { X } from "lucide-react";
import type { RankingMetric } from "../../utils/rankings";
import type { StatisticsFilters } from "../../utils/statistics";
import { Button, SegmentedControl } from "../ui";
import { StatisticsFacets } from "./StatisticsFacets";
import "./StatisticsFilterBar.css";

export interface StatisticsFilterBarProps {
  filters: StatisticsFilters;
  onChange: (filters: StatisticsFilters) => void;
  availableYears: number[];
  metric: RankingMetric;
  onMetricChange: (metric: RankingMetric) => void;
  isActive: boolean;
  onClear: () => void;
}

const METRIC_OPTIONS = [
  { value: "total", label: "Total" },
  { value: "theme", label: "Theme" },
  { value: "fun", label: "Fun" },
  { value: "fear", label: "Fear" },
];

/**
 * One filter row above everything it scopes — every card, chart and list on
 * the page re-renders against the same slice, so the numbers always agree.
 * The metric lives here too rather than inside the chart, because the Top 10
 * reads the same one.
 */
export function StatisticsFilterBar({
  filters,
  onChange,
  availableYears,
  metric,
  onMetricChange,
  isActive,
  onClear,
}: StatisticsFilterBarProps) {
  return (
    <div className="statistics-filters">
      <StatisticsFacets filters={filters} onChange={onChange} availableYears={availableYears} />

      <div className="statistics-filters__group">
        <span className="statistics-filters__label">Metric</span>
        <SegmentedControl
          options={METRIC_OPTIONS}
          value={metric}
          onChange={(value) => onMetricChange(value as RankingMetric)}
          aria-label="Metric"
        />
      </div>

      {isActive && (
        <Button variant="ghost" size="sm" leadingIcon={<X size={14} />} onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
