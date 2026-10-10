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
import { useHauntRegistry } from "../../hooks/useHauntRegistry";
import type { DebutCount } from "../../utils/statistics";
import { Panel } from "../ui";
import { ChartTooltip } from "./ChartTooltip";
import {
  AXIS_TICK,
  BAR_RADIUS,
  CHART_AXIS_LINE,
  CHART_GRID,
  CHART_LABEL_TEXT,
  MAX_BAR_SIZE,
  hauntSeriesColor,
} from "./chartTheme";
import "./Charts.css";

export interface NewDebutsChartProps {
  hauntId: string;
  counts: DebutCount[];
}

/**
 * How many new walk-throughs debuted each year — "New Mazes by Year" for
 * Knott's. Debuts, not line-ups: a maze back for its third season is counted
 * once, in the year it opened, so this is never "how many mazes that year".
 * One series in the haunt's own colour, every bar labelled.
 */
export function NewDebutsChart({ hauntId, counts }: NewDebutsChartProps) {
  const registry = useHauntRegistry();
  const things = registry.label("house", hauntId, "many");
  const color = hauntSeriesColor(hauntId);
  const total = counts.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <Panel elevated padding="lg" className="chart-panel chart-panel--compact">
      <div className="chart-panel__header">
        <h2 className="chart-panel__title">New {things} by Year</h2>
        <span className="chart-panel__note">
          {registry.hauntName(hauntId)} · {total} debuts
        </span>
      </div>

      <div className="chart-panel__plot chart-panel__plot--compact">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={counts} margin={{ top: 20, right: 16, bottom: 0, left: -20 }}>
            <CartesianGrid stroke={CHART_GRID} vertical={false} />
            <XAxis
              dataKey="year"
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
            <Tooltip
              content={({ active, payload }) => {
                const entry = active
                  ? (payload?.[0]?.payload as DebutCount | undefined)
                  : undefined;
                return entry ? (
                  <ChartTooltip
                    value={String(entry.count)}
                    title={`New in ${entry.year}`}
                    color={color}
                  />
                ) : null;
              }}
              cursor={{ fill: "var(--color-bg-2)" }}
            />
            <Bar
              dataKey="count"
              fill={color}
              maxBarSize={MAX_BAR_SIZE}
              radius={BAR_RADIUS}
              isAnimationActive={false}
            >
              <LabelList dataKey="count" position="top" fill={CHART_LABEL_TEXT} fontSize={11} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
