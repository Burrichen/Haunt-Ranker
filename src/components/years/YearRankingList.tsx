import { Link } from "react-router-dom";
import { RATING_MAX, RATING_TOTAL_MAX } from "../../models/rating";
import { cn } from "../../utils/cn";
import { formatScore } from "../../utils/formatScore";
import type { RankingMetric } from "../../utils/rankings";
import type { YearRanking, YearRankingSort, YearSummary } from "../../utils/years";
import { Badge } from "../ui";
import "./YearRankingList.css";

export interface YearRankingListProps {
  ranking: YearRanking;
  sort: YearRankingSort;
}

const METRICS: Array<{ key: RankingMetric; label: string; outOf: number }> = [
  { key: "total", label: "Total", outOf: RATING_TOTAL_MAX },
  { key: "theme", label: "Theme", outOf: RATING_MAX },
  { key: "fun", label: "Fun", outOf: RATING_MAX },
  { key: "fear", label: "Fear", outOf: RATING_MAX },
];

function SampleSize({ summary }: { summary: YearSummary }) {
  return (
    <span className="year-ranking-row__sample">
      {summary.reviewedCount} of {summary.attractionCount} reviewed
    </span>
  );
}

/**
 * Years ordered by an average of their reviewed attractions.
 *
 * Every row carries its sample size, and years with too few reviews to
 * average are listed below the ranking rather than inside it — a year with
 * a single review has no business sitting alongside a fully reviewed one as
 * though the two numbers meant the same thing.
 */
export function YearRankingList({ ranking, sort }: YearRankingListProps) {
  return (
    <div className="year-ranking">
      <ol className="year-ranking__list" aria-label="Year ranking">
        {ranking.ranked.map((summary, index) => (
          <li key={summary.eventYear.id} className="year-ranking-row">
            <Link to={`/years/${summary.eventYear.id}`} className="year-ranking-row__link">
              <span className="year-ranking-row__position">{index + 1}</span>
              <span className="year-ranking-row__name">{summary.eventYear.name}</span>
              <SampleSize summary={summary} />
              <span className="year-ranking-row__metrics">
                {METRICS.map(({ key, label, outOf }) => (
                  <span
                    key={key}
                    className={cn(
                      "year-ranking-row__metric",
                      key === sort.metric && "year-ranking-row__metric--active",
                    )}
                  >
                    <em>{label}</em>
                    {formatScore(summary.averages?.[key] ?? 0)}
                    <span className="year-ranking-row__out-of"> / {outOf}</span>
                  </span>
                ))}
              </span>
            </Link>
          </li>
        ))}
      </ol>

      {ranking.insufficient.length > 0 && (
        <section className="year-ranking__insufficient" aria-label="Not enough reviews to rank">
          <h3 className="year-ranking__insufficient-title">Not enough reviews to rank</h3>
          <p className="year-ranking__insufficient-description">
            These years are in the archive but haven&rsquo;t been reviewed enough to average. They
            stay out of the ranking rather than being listed as if one review spoke for the year.
          </p>
          <ul className="year-ranking__list">
            {ranking.insufficient.map((summary) => (
              <li key={summary.eventYear.id} className="year-ranking-row">
                <Link to={`/years/${summary.eventYear.id}`} className="year-ranking-row__link">
                  <span className="year-ranking-row__position" aria-hidden="true">
                    —
                  </span>
                  <span className="year-ranking-row__name">{summary.eventYear.name}</span>
                  <SampleSize summary={summary} />
                  <Badge variant="neutral">Not enough reviews</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
