import { Link } from "react-router-dom";
import { RATING_MAX, RATING_TOTAL_MAX } from "../../models/rating";
import { formatScore } from "../../utils/formatScore";
import type { RankingMetric } from "../../utils/rankings";
import type { ExplorerYearRow } from "../../utils/statisticsExplorer";
import "./ExplorerTable.css";

export interface ExplorerYearTableProps {
  rows: ExplorerYearRow[];
  metric: RankingMetric;
}

const METRIC_LABEL: Record<RankingMetric, string> = {
  total: "Total",
  theme: "Theme",
  fun: "Fun",
  fear: "Fear",
};

/**
 * Event years ranked by the average of one metric across their reviewed
 * attractions.
 *
 * The review count has its own column rather than a footnote: an average of
 * one is a real answer to the query and shouldn't be hidden, but it should
 * never be readable without the number it rests on.
 */
export function ExplorerYearTable({ rows, metric }: ExplorerYearTableProps) {
  if (rows.length === 0) {
    return (
      <p className="explorer-table__empty">
        No year has a reviewed attraction matching these filters, so there are no averages to rank.
      </p>
    );
  }

  return (
    <div className="explorer-table__scroll">
      <table className="explorer-table">
        <caption className="explorer-table__caption">
          {rows.length} {rows.length === 1 ? "year" : "years"} ranked by average{" "}
          {METRIC_LABEL[metric].toLowerCase()}
        </caption>
        <thead>
          <tr>
            <th scope="col" className="explorer-table__rank">
              #
            </th>
            <th scope="col">Event</th>
            <th scope="col">Year</th>
            <th scope="col" className="explorer-table__number">
              Avg {METRIC_LABEL[metric]}
            </th>
            <th scope="col" className="explorer-table__number">
              Reviews
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.calendarYear} className="explorer-table__row">
              <td className="explorer-table__rank">{row.rank}</td>
              <td>
                <Link to={`/years/${row.eventYearId}`} className="explorer-table__link">
                  {row.label}
                </Link>
              </td>
              <td className="explorer-table__year">{row.calendarYear}</td>
              <td className="explorer-table__number explorer-table__number--primary">
                {formatScore(row.average)}
                <span className="explorer-table__out-of">
                  {" "}
                  / {metric === "total" ? RATING_TOTAL_MAX : RATING_MAX}
                </span>
              </td>
              <td className="explorer-table__number">{row.reviewedCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
