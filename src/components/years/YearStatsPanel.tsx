import { Link } from "react-router-dom";
import type { EventYear } from "../../models/eventYear";
import { RATING_MAX, RATING_TOTAL_MAX } from "../../models/rating";
import { formatScore } from "../../utils/formatScore";
import { MIN_REVIEWED_FOR_STATS, type SuperlativeKey, type YearStats } from "../../utils/years";
import { AttractionHoverPreview } from "../archive";
import { Panel } from "../ui";
import "./YearStatsPanel.css";

export interface YearStatsPanelProps {
  stats: YearStats;
  eventYear: EventYear;
}

const SUPERLATIVES: Array<{ key: SuperlativeKey; label: string; outOf: number }> = [
  { key: "highestRated", label: "Highest Rated", outOf: RATING_TOTAL_MAX },
  { key: "lowestRated", label: "Lowest Rated", outOf: RATING_TOTAL_MAX },
  { key: "bestTheme", label: "Best Theme", outOf: RATING_MAX },
  { key: "lowestTheme", label: "Lowest Theme", outOf: RATING_MAX },
  { key: "mostFun", label: "Most Fun", outOf: RATING_MAX },
  { key: "leastFun", label: "Least Fun", outOf: RATING_MAX },
  { key: "scariest", label: "Scariest", outOf: RATING_MAX },
  { key: "leastScary", label: "Least Scary", outOf: RATING_MAX },
];

/**
 * A year's statistics, computed from reviewed attractions only. When too
 * little of the year has been reviewed it says so plainly instead of
 * printing an average of one record as though it described the year.
 */
export function YearStatsPanel({ stats, eventYear }: YearStatsPanelProps) {
  const { averages, superlatives, reviewedCount, attractionCount } = stats;

  if (!averages || !superlatives) {
    return (
      <Panel elevated padding="lg" className="year-stats">
        <h2 className="year-stats__title">Statistics</h2>
        <p className="year-stats__insufficient">
          Not enough reviewed attractions to say anything yet — {reviewedCount} of {attractionCount}{" "}
          reviewed. Rate at least {MIN_REVIEWED_FOR_STATS} and the averages and highlights for this
          year appear here.
        </p>
      </Panel>
    );
  }

  return (
    <Panel elevated padding="lg" className="year-stats">
      <div className="year-stats__header">
        <h2 className="year-stats__title">Statistics</h2>
        {/* The sample size sits with the numbers, never out of sight of them. */}
        <span className="year-stats__sample">
          from {reviewedCount} of {attractionCount} reviewed
        </span>
      </div>

      <dl className="year-stats__averages">
        <div className="year-stats__average">
          <dt>Avg Theme</dt>
          <dd>
            {formatScore(averages.theme)}
            <span className="year-stats__out-of"> / {RATING_MAX}</span>
          </dd>
        </div>
        <div className="year-stats__average">
          <dt>Avg Fun</dt>
          <dd>
            {formatScore(averages.fun)}
            <span className="year-stats__out-of"> / {RATING_MAX}</span>
          </dd>
        </div>
        <div className="year-stats__average">
          <dt>Avg Fear</dt>
          <dd>
            {formatScore(averages.fear)}
            <span className="year-stats__out-of"> / {RATING_MAX}</span>
          </dd>
        </div>
        <div className="year-stats__average year-stats__average--total">
          <dt>Avg Total</dt>
          <dd>
            {formatScore(averages.total)}
            <span className="year-stats__out-of"> / {RATING_TOTAL_MAX}</span>
          </dd>
        </div>
      </dl>

      <ul className="year-stats__superlatives">
        {SUPERLATIVES.map(({ key, label, outOf }) => {
          const pick = superlatives[key];
          return (
            <li key={key} className="year-stats__superlative">
              <span className="year-stats__superlative-label">{label}</span>
              <AttractionHoverPreview
                attraction={pick.attraction}
                eventYear={eventYear}
                rating={pick.rating}
              >
                <Link
                  to={`/attractions/${pick.attraction.id}`}
                  className="year-stats__superlative-link"
                >
                  {pick.attraction.name}
                </Link>
              </AttractionHoverPreview>
              <span className="year-stats__superlative-value">
                {formatScore(pick.value)}
                <span className="year-stats__out-of"> / {outOf}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
