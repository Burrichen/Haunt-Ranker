import { Link } from "react-router-dom";
import { RATING_MAX, RATING_TOTAL_MAX } from "../../models/rating";
import { formatScore } from "../../utils/formatScore";
import type { RankingMetric } from "../../utils/rankings";
import type { TopAttraction } from "../../utils/statistics";
import { useHauntScope } from "../../hooks/useHauntScope";
import { AttractionHoverPreview } from "../archive";
import { Panel, SegmentedControl } from "../ui";
import { HauntTag } from "./HauntTag";
import "./TopAttractionsList.css";

export type TopListEnd = "top" | "bottom";

export interface TopAttractionsListProps {
  attractions: TopAttraction[];
  metric: RankingMetric;
  /** Which end of the ranking is shown. Defaults to the top. */
  end?: TopListEnd;
  /** Offered when given: switches between the Top 10 and the Bottom 10. */
  onEndChange?: (end: TopListEnd) => void;
}

const END_OPTIONS = [
  { value: "top" as const, label: "Top 10" },
  { value: "bottom" as const, label: "Bottom 10" },
];

const METRIC_LABEL: Record<RankingMetric, string> = {
  total: "Total",
  theme: "Theme",
  fun: "Fun",
  fear: "Fear",
};

/**
 * The best (or worst) of the current slice by the metric on screen, with the
 * same hover preview and wiki link as everywhere else. Ordered purely by
 * score: under All Haunts, HHN houses and Knott's mazes compete for the same
 * places, and each row says which haunt it's from.
 */
export function TopAttractionsList({
  attractions,
  metric,
  end = "top",
  onEndChange,
}: TopAttractionsListProps) {
  const outOf = metric === "total" ? RATING_TOTAL_MAX : RATING_MAX;
  const { isAllHaunts } = useHauntScope();
  const title = end === "top" ? "Top attractions" : "Bottom attractions";

  return (
    <Panel elevated padding="lg" className="top-attractions">
      <div className="top-attractions__header">
        <h2 className="top-attractions__title">{title}</h2>
        <span className="top-attractions__note">by {METRIC_LABEL[metric].toLowerCase()}</span>
        {onEndChange && (
          <SegmentedControl
            options={END_OPTIONS}
            value={end}
            onChange={onEndChange}
            aria-label="Top or bottom"
          />
        )}
      </div>

      {attractions.length === 0 ? (
        <p className="top-attractions__empty">
          Nothing reviewed in this slice yet — the leaderboard fills in as you rate.
        </p>
      ) : (
        <ol className="top-attractions__list" aria-label={title}>
          {attractions.map((item, index) => (
            <li key={item.attraction.id} className="top-attractions__row">
              <AttractionHoverPreview
                attraction={item.attraction}
                eventYear={item.eventYear}
                rating={item.rating}
              >
                <span className="top-attractions__inner">
                  <span className="top-attractions__position">{index + 1}</span>
                  <Link to={`/attractions/${item.attraction.id}`} className="top-attractions__link">
                    <span className="top-attractions__name">{item.attraction.name}</span>
                    {item.eventYear && (
                      <span className="top-attractions__year">{item.eventYear.calendarYear}</span>
                    )}
                    {isAllHaunts && <HauntTag hauntId={item.eventYear?.hauntId} />}
                    <span className="top-attractions__value">
                      {formatScore(item.value)}
                      <span className="top-attractions__out-of"> / {outOf}</span>
                    </span>
                  </Link>
                </span>
              </AttractionHoverPreview>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
