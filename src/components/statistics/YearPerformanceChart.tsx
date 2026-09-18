import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RATING_MAX, RATING_TOTAL_MAX } from "../../models/rating";
import { formatScore } from "../../utils/formatScore";
import type { RankingMetric } from "../../utils/rankings";
import type { YearPerformancePoint } from "../../utils/statistics";
import { Panel } from "../ui";
import { ChartTooltip } from "./ChartTooltip";
import { AXIS_TICK, CHART_AXIS_LINE, CHART_GRID, CHART_MARK, CHART_SURFACE } from "./chartTheme";
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

interface TooltipPayloadEntry {
  payload?: YearPerformancePoint;
}

function renderTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: readonly TooltipPayloadEntry[];
}) {
  const point = active ? payload?.[0]?.payload : undefined;
  if (!point) {
    return null;
  }

  return (
    <ChartTooltip
      value={formatScore(point.average)}
      title={point.label}
      detail={`average of ${point.reviewedCount} reviewed`}
    />
  );
}

/**
 * Average score per event year.
 *
 * Years nobody has reviewed are absent from `points` entirely rather than
 * plotted at zero — a dip to the axis would read as "this event scored
 * nothing" when the truth is that it hasn't been reviewed. A single series,
 * so there's no legend: the panel title already says what's plotted.
 */
export function YearPerformanceChart({ points, metric }: YearPerformanceChartProps) {
  const max = metric === "total" ? RATING_TOTAL_MAX : RATING_MAX;
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

      {points.length === 0 ? (
        <p className="chart-panel__empty">
          No reviewed attractions in this slice yet, so there&rsquo;s no yearly average to plot.
        </p>
      ) : (
        <div className="chart-panel__plot">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 16, right: 16, bottom: 0, left: -12 }}>
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
                content={renderTooltip}
                cursor={{ stroke: CHART_AXIS_LINE, strokeWidth: 1 }}
              />
              <Line
                type="linear"
                dataKey="average"
                stroke={CHART_MARK}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                /* 8px markers, each ringed in the surface colour so they stay
                   legible where they sit on the line. */
                dot={{ r: 4, fill: CHART_MARK, stroke: CHART_SURFACE, strokeWidth: 2 }}
                activeDot={{ r: 6, fill: CHART_MARK, stroke: CHART_SURFACE, strokeWidth: 2 }}
                isAnimationActive={false}
              />
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
