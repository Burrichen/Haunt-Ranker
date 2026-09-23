import { coveragePercent, type Coverage, type CoverageSlice } from "../../utils/statistics";
import { Panel } from "../ui";
import "./CoveragePanel.css";
import { attractionTypeLabel } from "../../models/haunt";

export interface CoveragePanelProps {
  coverage: Coverage;
}

function CoverageMeter({ label, slice }: { label: string; slice: CoverageSlice }) {
  const percent = coveragePercent(slice);

  return (
    <div className="coverage__row">
      <div className="coverage__heading">
        <span className="coverage__label">{label}</span>
        <span className="coverage__value">
          {slice.reviewed} <span className="coverage__of">/ {slice.total}</span>
        </span>
      </div>
      <div
        className="coverage__track"
        role="progressbar"
        aria-label={`${label} reviewed`}
        aria-valuenow={slice.reviewed}
        aria-valuemin={0}
        aria-valuemax={slice.total}
        aria-valuetext={`${slice.reviewed} of ${slice.total} reviewed`}
      >
        <div className="coverage__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

/**
 * How much of the current slice has actually been reviewed — the honest
 * denominator behind every other number on this page. A plain meter rather
 * than a donut: it's one ratio against a limit, and the track is a lighter
 * step of the fill's own hue so the state reads across the whole bar.
 */
export function CoveragePanel({ coverage }: CoveragePanelProps) {
  return (
    <Panel elevated padding="lg" className="coverage">
      <h2 className="coverage__title">Review coverage</h2>
      <CoverageMeter label="All attractions" slice={coverage.all} />
      <CoverageMeter label={attractionTypeLabel("house", null, "many")} slice={coverage.houses} />
      <CoverageMeter label="Scare Zones" slice={coverage.scareZones} />
    </Panel>
  );
}
