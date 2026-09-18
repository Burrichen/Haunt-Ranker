import "./ChartTooltip.css";

export interface ChartTooltipProps {
  /** The value, formatted — it leads, because the reader already knows what they hovered. */
  value: string;
  /** What was hovered: a year, a score band. */
  title: string;
  /** One short qualifying line, e.g. the sample size behind an average. */
  detail?: string;
}

/**
 * The readout shared by both charts. The value is the strong element and the
 * label follows it — the legend's hierarchy inverted, because here the reader
 * has the category and wants the number. The series is keyed with a short
 * stroke of the mark colour rather than a filled box.
 */
export function ChartTooltip({ value, title, detail }: ChartTooltipProps) {
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__headline">
        <span aria-hidden="true" className="chart-tooltip__key" />
        <span className="chart-tooltip__value">{value}</span>
      </div>
      <span className="chart-tooltip__title">{title}</span>
      {detail && <span className="chart-tooltip__detail">{detail}</span>}
    </div>
  );
}
