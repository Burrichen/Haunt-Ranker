import { PageHeader, SegmentedControl } from "../components/ui";
import { useStatisticsView } from "../hooks/useStatistics";
import type { StatisticsView } from "../utils/statisticsParams";
import { StatisticsDashboard } from "./StatisticsDashboard";
import { StatisticsExplorer } from "./StatisticsExplorer";
import "./Statistics.css";

const VIEW_OPTIONS = [
  { value: "dashboard" as const, label: "Dashboard" },
  { value: "explorer" as const, label: "Stats Explorer" },
];

const SUBTITLE: Record<StatisticsView, string> = {
  dashboard: "What your reviews add up to.",
  explorer: "Ask the archive anything you can express as a ranking.",
};

/**
 * The shell for both statistics views. Only the active one's data hook
 * mounts, and the two never show competing filter rows — the explorer brings
 * its own controls, and it inherits whatever slice the dashboard was showing.
 */
export function Statistics() {
  const [view, setView] = useStatisticsView();

  return (
    <div className="statistics">
      <PageHeader title="Statistics" subtitle={SUBTITLE[view]} />

      <SegmentedControl
        options={VIEW_OPTIONS}
        value={view}
        onChange={(next: StatisticsView) => setView(next)}
        aria-label="Statistics view"
      />

      {view === "dashboard" ? <StatisticsDashboard /> : <StatisticsExplorer />}
    </div>
  );
}
