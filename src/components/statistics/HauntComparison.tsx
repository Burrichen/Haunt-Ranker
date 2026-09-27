import { useHauntRegistry } from "../../hooks/useHauntRegistry";
import { RATING_MAX, RATING_TOTAL_MAX } from "../../models/rating";
import { formatScore } from "../../utils/formatScore";
import type { HauntComparisonRow } from "../../utils/statistics";
import { MIN_REVIEWED_FOR_STATS } from "../../utils/years";
import { Panel } from "../ui";
import "./HauntComparison.css";

export interface HauntComparisonProps {
  rows: HauntComparisonRow[];
}

const METRICS: Array<{ key: "total" | "theme" | "fun" | "fear"; label: string; outOf: number }> = [
  { key: "total", label: "Total", outOf: RATING_TOTAL_MAX },
  { key: "theme", label: "Theme", outOf: RATING_MAX },
  { key: "fun", label: "Fun", outOf: RATING_MAX },
  { key: "fear", label: "Fear", outOf: RATING_MAX },
];

/**
 * The haunts side by side, and nothing more than that.
 *
 * Deliberately a plain table: no winner, no highlight, no ordering by
 * score. Every row states how many of its attractions the averages came
 * from, because an average of four reviews and an average of two hundred
 * are not the same kind of number, and a haunt reviewed too thinly to
 * average says so instead of showing one.
 */
export function HauntComparison({ rows }: HauntComparisonProps) {
  const registry = useHauntRegistry();
  // A comparison needs two things to compare. With one haunt in the slice
  // this panel would just restate the figures above it.
  const comparable = rows.filter((row) => row.attractionCount > 0);
  if (comparable.length < 2) {
    return null;
  }

  return (
    <Panel elevated padding="lg" className="haunt-comparison">
      <h2 className="haunt-comparison__title">By haunt</h2>

      <table className="haunt-comparison__table">
        <thead>
          <tr>
            <th scope="col">Haunt</th>
            <th scope="col">Reviewed</th>
            {METRICS.map((metric) => (
              <th key={metric.key} scope="col">
                {metric.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {comparable.map((row) => (
            <tr key={row.hauntId}>
              <th scope="row">{registry.hauntName(row.hauntId) ?? row.hauntId}</th>
              <td className="haunt-comparison__sample">
                {row.reviewedCount} of {row.attractionCount}
              </td>
              {row.averages ? (
                METRICS.map((metric) => (
                  <td key={metric.key}>
                    {formatScore(row.averages?.[metric.key] ?? 0)}
                    <span className="haunt-comparison__out-of"> / {metric.outOf}</span>
                  </td>
                ))
              ) : (
                <td className="haunt-comparison__insufficient" colSpan={METRICS.length}>
                  Not enough reviewed to average
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <p className="haunt-comparison__note">
        Averages cover reviewed attractions only, and appear once at least {MIN_REVIEWED_FOR_STATS}{" "}
        of a haunt&rsquo;s attractions have been rated. Read them against the sample sizes beside
        them rather than as a ranking.
      </p>
    </Panel>
  );
}
