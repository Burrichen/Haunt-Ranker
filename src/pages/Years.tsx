import { ArrowUpDown, Calendar, CircleAlert } from "lucide-react";
import { YearCard, YearRankingList } from "../components/years";
import {
  Button,
  Dropdown,
  EmptyState,
  LoadingState,
  PageHeader,
  SegmentedControl,
  type DropdownItem,
} from "../components/ui";
import { useHauntScope } from "../hooks/useHauntScope";
import { useYearsOverview } from "../hooks/useYearsOverview";
import { hauntScopeLabel } from "../models/haunt";
import {
  RANKING_DIRECTIONS,
  RANKING_METRICS,
  rankingSortLabel,
  type RankingDirection,
  type RankingMetric,
} from "../utils/rankings";
import type { YearRankingSort } from "../utils/years";
import type { YearsView } from "../utils/yearsParams";
import "./Years.css";

const VIEW_OPTIONS = [
  { value: "overview" as const, label: "Overview" },
  { value: "rankings" as const, label: "Year Rankings" },
];

const SORT_OPTIONS: YearRankingSort[] = RANKING_METRICS.flatMap((metric: RankingMetric) =>
  RANKING_DIRECTIONS.map((direction: RankingDirection) => ({ metric, direction })),
);

export function Years() {
  const { isLoading, error, summaries, view, setView, sort, setSort, ranking } = useYearsOverview();
  const { scope, isAllHaunts } = useHauntScope();

  const sortItems: DropdownItem[] = SORT_OPTIONS.map((option) => ({
    label: `Average ${rankingSortLabel(option)}`,
    onSelect: () => setSort(option),
  }));

  return (
    <div className="years">
      <PageHeader
        title="Years"
        subtitle={
          isAllHaunts
            ? "Every season from both haunts, and how they compare."
            : `Every ${hauntScopeLabel(scope)} season, and how they compare.`
        }
        actions={
          view === "rankings" ? (
            <Dropdown
              align="end"
              items={sortItems}
              trigger={
                <Button
                  variant="secondary"
                  leadingIcon={<ArrowUpDown size={15} strokeWidth={1.75} />}
                >
                  Average {rankingSortLabel(sort)}
                </Button>
              }
            />
          ) : undefined
        }
      />

      <SegmentedControl
        options={VIEW_OPTIONS}
        value={view}
        onChange={(next: YearsView) => setView(next)}
        aria-label="Years view"
      />

      {isLoading ? (
        <LoadingState label="Loading years…" />
      ) : error ? (
        <EmptyState
          icon={<CircleAlert size={24} />}
          title="Couldn't load the years"
          description={error}
        />
      ) : summaries.length === 0 ? (
        <EmptyState
          icon={<Calendar size={24} />}
          title="No years yet"
          description={
            isAllHaunts
              ? "Seasons will appear here as they're added to the archive."
              : `No ${hauntScopeLabel(scope)} seasons are in the archive yet.`
          }
        />
      ) : view === "rankings" ? (
        <YearRankingList ranking={ranking} sort={sort} />
      ) : (
        <div className="years__grid">
          {summaries.map((summary) => (
            <YearCard key={summary.eventYear.id} summary={summary} />
          ))}
        </div>
      )}
    </div>
  );
}
