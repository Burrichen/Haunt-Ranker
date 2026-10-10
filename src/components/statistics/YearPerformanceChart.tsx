import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useHauntRegistry } from "../../hooks/useHauntRegistry";
import { RATING_MAX, RATING_TOTAL_MAX } from "../../models/rating";
import { formatScore } from "../../utils/formatScore";
import type { RankingMetric } from "../../utils/rankings";
import type { YearPerformancePoint } from "../../utils/statistics";
import { Panel } from "../ui";
import { ChartTooltip } from "./ChartTooltip";
import {
  AXIS_TICK,
  CHART_AXIS_LINE,
  CHART_GRID,
  CHART_SURFACE,
  hauntSeriesColor,
} from "./chartTheme";
import "./Charts.css";

export interface YearPerformanceChartProps {
  points: YearPerformancePoint[];
  metric: RankingMetric;
}

const METRIC_LABEL: Record<RankingMetric, string> = {
  total: "Total",
  theme: "Theme",
  fun: "Fun",
  fear: "Fear",
};

/** One x-axis year, with each haunt's season (where reviewed) keyed by haunt. */
type YearRow = { calendarYear: number } & Record<string, number | YearPerformancePoint>;

const valueKey = (hauntId: string) => `avg:${hauntId}`;
const pointKey = (hauntId: string) => `point:${hauntId}`;

/** Points pivoted to one row per year, so each haunt can be its own line. */
function pivot(points: YearPerformancePoint[]): YearRow[] {
  const rows = new Map<number, YearRow>();
  for (const point of points) {
    const row = rows.get(point.calendarYear) ?? ({ calendarYear: point.calendarYear } as YearRow);
    row[valueKey(point.hauntId)] = point.average;
    row[pointKey(point.hauntId)] = point;
    rows.set(point.calendarYear, row);
  }
  return [...rows.values()].sort((a, b) => a.calendarYear - b.calendarYear);
}

interface TooltipPayloadEntry {
  payload?: YearRow;
}

function makeTooltip(hauntIds: string[]) {
  const split = hauntIds.length > 1;
  return function renderTooltip({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: readonly TooltipPayloadEntry[];
  }) {
    const row = active ? payload?.[0]?.payload : undefined;
    if (!row) {
      return null;
    }
    const seasons = hauntIds
      .map((hauntId) => row[pointKey(hauntId)] as YearPerformancePoint | undefined)
      .filter((point): point is YearPerformancePoint => point !== undefined);

    return (
      <div className="chart-tooltip-stack">
        {seasons.map((point) => (
          <ChartTooltip
            key={point.eventYearId}
            value={formatScore(point.average)}
            title={point.label}
            detail={`average of ${point.reviewedCount} reviewed`}
            color={split ? hauntSeriesColor(point.hauntId) : undefined}
          />
        ))}
      </div>
    );
  };
}

/**
 * Average score per event year.
 *
 * Years nobody has reviewed are absent from `points` entirely rather than
 * plotted at zero — a dip to the axis would read as "this event scored
 * nothing" when the truth is that it hasn't been reviewed.
 *
 * One haunt in the slice is one series in the theme's colour, with no legend
 * — the panel title says what's plotted. With both haunts (All Haunts), each
 * is its own line in its own haunt's colour, named in a legend.
 */
export function YearPerformanceChart({ points, metric }: YearPerformanceChartProps) {
  const registry = useHauntRegistry();
  const max = metric === "total" ? RATING_TOTAL_MAX : RATING_MAX;
  const order = (hauntId: string) => {
    const index = registry.haunts.findIndex((haunt) => haunt.id === hauntId);
    return index < 0 ? Number.MAX_SAFE_INTEGER : index;
  };
  const hauntIds = [...new Set(points.map((point) => point.hauntId))].sort(
    (a, b) => order(a) - order(b),
  );
  const split = hauntIds.length > 1;
  const rows = pivot(points);
  const peak = points.reduce<YearPerformancePoint | null>(
    (best, point) => (best === null || point.average > best.average ? point : best),
    null,
  );

  return (
    <Panel elevated padding="lg" className="chart-panel">
      <div className="chart-panel__header">
        <h2 className="chart-panel__title">Average {METRIC_LABEL[metric]} by year</h2>
        <span className="chart-panel__note">Years with no reviews are left out</span>
      </div>

      {split && (
        <ul className="chart-legend" aria-label="Series">
          {hauntIds.map((hauntId) => (
            <li key={hauntId} className="chart-legend__item">
              <span
                aria-hidden="true"
                className="chart-legend__key"
                style={{ backgroundColor: hauntSeriesColor(hauntId) }}
              />
              {registry.hauntName(hauntId) ?? hauntId}
            </li>
          ))}
        </ul>
      )}

      {points.length === 0 ? (
        <p className="chart-panel__empty">
          No reviewed attractions in this slice yet, so there&rsquo;s no yearly average to plot.
        </p>
      ) : (
        <div className="chart-panel__plot">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 16, right: 16, bottom: 0, left: -12 }}>
              <CartesianGrid stroke={CHART_GRID} vertical={false} />
              <XAxis
                dataKey="calendarYear"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={{ stroke: CHART_AXIS_LINE }}
              />
              <YAxis
                domain={[0, max]}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip
                content={makeTooltip(hauntIds)}
                cursor={{ stroke: CHART_AXIS_LINE, strokeWidth: 1 }}
              />
              {hauntIds.map((hauntId) => {
                // One haunt: the theme's series colour. Two: each its own.
                const color = split ? hauntSeriesColor(hauntId) : "var(--series)";
                return (
                  <Line
                    key={hauntId}
                    name={registry.hauntName(hauntId) ?? hauntId}
                    type="linear"
                    dataKey={valueKey(hauntId)}
                    stroke={color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    // A year with no reviewed season for this haunt is
                    // skipped, never plotted as zero.
                    connectNulls
                    /* 8px markers, each ringed in the surface colour so they
                       stay legible where they sit on, or cross, a line. */
                    dot={{ r: 4, fill: color, stroke: CHART_SURFACE, strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: color, stroke: CHART_SURFACE, strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {peak && (
        /* One direct label, on the extreme — the axis and tooltip carry the
           rest, rather than a number on every point. */
        <p className="chart-panel__callout">
          Best year: <strong>{peak.label}</strong> at {formatScore(peak.average)} average{" "}
          {METRIC_LABEL[metric].toLowerCase()} from {peak.reviewedCount} reviewed.
        </p>
      )}
    </Panel>
  );
}
