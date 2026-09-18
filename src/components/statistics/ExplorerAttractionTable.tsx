import { Link } from "react-router-dom";
import { RATING_MAX, RATING_TOTAL_MAX } from "../../models/rating";
import { formatScore } from "../../utils/formatScore";
import type { RankingMetric } from "../../utils/rankings";
import type { StatisticsRow } from "../../utils/statistics";
import type { ExplorerAttractionResult } from "../../utils/statisticsExplorer";
import { AttractionHoverPreview, ParkBadgeRow } from "../archive";
import { Badge } from "../ui";
import "./ExplorerTable.css";

export interface ExplorerAttractionTableProps {
  result: ExplorerAttractionResult;
  metric: RankingMetric;
}

const METRIC_LABEL: Record<RankingMetric, string> = {
  total: "Total",
  theme: "Theme",
  fun: "Fun",
  fear: "Fear",
};

function UnratedRow({ row }: { row: StatisticsRow }) {
  return (
    <tr className="explorer-table__row">
      <td className="explorer-table__rank" aria-hidden="true">
        —
      </td>
      <td>
        <AttractionHoverPreview attraction={row.attraction} eventYear={row.eventYear} rating={null}>
          <Link to={`/attractions/${row.attraction.id}`} className="explorer-table__link">
            {row.attraction.name}
          </Link>
        </AttractionHoverPreview>
      </td>
      <td className="explorer-table__year">{row.eventYear?.calendarYear ?? "—"}</td>
      <td>
        <ParkBadgeRow parkIds={row.attraction.parkIds} />
      </td>
      <td colSpan={2}>
        <Badge variant="neutral">Not Rated</Badge>
      </td>
    </tr>
  );
}

/**
 * The answer to an attraction query. Rank, attraction, year, parks, the metric
 * being ranked by, and the total alongside it whenever the metric isn't
 * already the total.
 *
 * Unrated matches never get a rank — a missing score isn't a low one — so when
 * they're shown at all they follow the ranking in their own labelled block.
 */
export function ExplorerAttractionTable({ result, metric }: ExplorerAttractionTableProps) {
  const showTotal = metric !== "total";
  const columnCount = showTotal ? 6 : 5;

  if (result.ranked.length === 0 && result.unrated.length === 0) {
    return (
      <p className="explorer-table__empty">
        {result.matchCount === 0
          ? "Nothing matches these filters — try widening them."
          : "Nothing matching has been reviewed yet, so there's nothing to rank."}
      </p>
    );
  }

  return (
    <div className="explorer-table__scroll">
      <table className="explorer-table">
        <caption className="explorer-table__caption">
          {result.ranked.length} ranked by {METRIC_LABEL[metric].toLowerCase()}
          {result.unrated.length > 0 && `, ${result.unrated.length} unrated`}
        </caption>
        <thead>
          <tr>
            <th scope="col" className="explorer-table__rank">
              #
            </th>
            <th scope="col">Attraction</th>
            <th scope="col">Year</th>
            <th scope="col">Parks</th>
            <th scope="col" className="explorer-table__number">
              {METRIC_LABEL[metric]}
            </th>
            {showTotal && (
              <th scope="col" className="explorer-table__number">
                Total
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {result.ranked.map((row) => (
            <tr key={row.attraction.id} className="explorer-table__row">
              <td className="explorer-table__rank">{row.rank}</td>
              <td>
                <AttractionHoverPreview
                  attraction={row.attraction}
                  eventYear={row.eventYear}
                  rating={row.rating}
                >
                  <Link to={`/attractions/${row.attraction.id}`} className="explorer-table__link">
                    {row.attraction.name}
                  </Link>
                </AttractionHoverPreview>
              </td>
              <td className="explorer-table__year">{row.eventYear?.calendarYear ?? "—"}</td>
              <td>
                <ParkBadgeRow parkIds={row.attraction.parkIds} />
              </td>
              <td className="explorer-table__number explorer-table__number--primary">
                {formatScore(row.value)}
                <span className="explorer-table__out-of">
                  {" "}
                  / {metric === "total" ? RATING_TOTAL_MAX : RATING_MAX}
                </span>
              </td>
              {showTotal && (
                <td className="explorer-table__number">
                  {formatScore(row.rating.total)}
                  <span className="explorer-table__out-of"> / {RATING_TOTAL_MAX}</span>
                </td>
              )}
            </tr>
          ))}

          {result.unrated.length > 0 && (
            <>
              <tr>
                <th scope="colgroup" colSpan={columnCount} className="explorer-table__group">
                  Not rated ({result.unrated.length}) — matched the filters, but can&rsquo;t be
                  ranked
                </th>
              </tr>
              {result.unrated.map((row) => (
                <UnratedRow key={row.attraction.id} row={row} />
              ))}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
