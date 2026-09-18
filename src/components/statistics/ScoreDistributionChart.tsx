import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RATING_TOTAL_MAX } from "../../models/rating";
import type { DistributionBucket } from "../../utils/statistics";
import { Panel } from "../ui";
import { ChartTooltip } from "./ChartTooltip";
import {
  AXIS_TICK,
  BAR_RADIUS,
  CHART_AXIS_LINE,
  CHART_GRID,
  CHART_LABEL_TEXT,
  CHART_MARK,
  MAX_BAR_SIZE,
} from "./chartTheme";
import "./Charts.css";

export interface ScoreDistributionChartProps {
  buckets: DistributionBucket[];
  /** How many reviewed attractions the buckets describe in total. */
  reviewedCount: number;
}

interface TooltipPayloadEntry {
  payload?: DistributionBucket;
}

function renderTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: readonly TooltipPayloadEntry[];
}) {
  const bucket = active ? payload?.[0]?.payload : undefined;
  if (!bucket) {
    return null;
  }

  return (
    <ChartTooltip
      value={`${bucket.count} ${bucket.count === 1 ? "attraction" : "attractions"}`}
      title={`Total ${bucket.label} out of ${RATING_TOTAL_MAX}`}
    />
  );
}

/**
 * How reviewed total scores spread across the 0–15 range, in five bands.
 *
 * Every bar is the same colour: one series, and the bar's height already
 * encodes the count — shading it by size too would spend the colour channel
 * on information the chart is showing anyway. Counts are labelled on the
 * caps so no value is reachable only by hovering.
 */
export function ScoreDistributionChart({ buckets, reviewedCount }: ScoreDistributionChartProps) {
  return (
    <Panel elevated padding="lg" className="chart-panel">
      <div className="chart-panel__header">
        <h2 className="chart-panel__title">Score distribution</h2>
        <span className="chart-panel__note">
          {reviewedCount} reviewed, by total out of {RATING_TOTAL_MAX}
        </span>
      </div>

      {reviewedCount === 0 ? (
        <p className="chart-panel__empty">
          Nothing reviewed in this slice yet — rate an attraction and it shows up here.
        </p>
      ) : (
        <div className="chart-panel__plot">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={buckets} margin={{ top: 20, right: 16, bottom: 0, left: -20 }}>
              <CartesianGrid stroke={CHART_GRID} vertical={false} />
              <XAxis
                dataKey="label"
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={{ stroke: CHART_AXIS_LINE }}
              />
              <YAxis
                allowDecimals={false}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip content={renderTooltip} cursor={{ fill: "var(--color-bg-2)" }} />
              <Bar
                dataKey="count"
                fill={CHART_MARK}
                maxBarSize={MAX_BAR_SIZE}
                radius={BAR_RADIUS}
                isAnimationActive={false}
              >
                <LabelList dataKey="count" position="top" fill={CHART_LABEL_TEXT} fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}
