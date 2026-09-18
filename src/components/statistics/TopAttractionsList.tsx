import { Link } from "react-router-dom";
import { RATING_MAX, RATING_TOTAL_MAX } from "../../models/rating";
import { formatScore } from "../../utils/formatScore";
import type { RankingMetric } from "../../utils/rankings";
import type { TopAttraction } from "../../utils/statistics";
import { AttractionHoverPreview } from "../archive";
import { Panel } from "../ui";
import "./TopAttractionsList.css";

export interface TopAttractionsListProps {
  attractions: TopAttraction[];
  metric: RankingMetric;
}

const METRIC_LABEL: Record<RankingMetric, string> = {
  total: "Total",
  theme: "Theme",
  fun: "Fun",
  fear: "Fear",
};

/** The best of the current slice by the metric on screen, with the same hover preview and wiki link as everywhere else. */
export function TopAttractionsList({ attractions, metric }: TopAttractionsListProps) {
  const outOf = metric === "total" ? RATING_TOTAL_MAX : RATING_MAX;

  return (
    <Panel elevated padding="lg" className="top-attractions">
      <div className="top-attractions__header">
        <h2 className="top-attractions__title">Top attractions</h2>
        <span className="top-attractions__note">by {METRIC_LABEL[metric].toLowerCase()}</span>
      </div>

      {attractions.length === 0 ? (
        <p className="top-attractions__empty">
          Nothing reviewed in this slice yet — the leaderboard fills in as you rate.
        </p>
      ) : (
        <ol className="top-attractions__list" aria-label="Top attractions">
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
