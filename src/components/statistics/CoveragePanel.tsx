import { coveragePercent, type Coverage, type CoverageSlice } from "../../utils/statistics";
import { Panel } from "../ui";
import "./CoveragePanel.css";
import { useHauntScope } from "../../hooks/useHauntScope";
import { useHauntRegistry } from "../../hooks/useHauntRegistry";
import { hauntTheme } from "../../models/hauntTheme";

export interface CoveragePanelProps {
  coverage: Coverage;
}

function CoverageMeter({
  label,
  slice,
  hauntId,
}: {
  label: string;
  slice: CoverageSlice;
  /** A haunt's own meter is filled in that haunt's colour. */
  hauntId?: string;
}) {
  const percent = coveragePercent(slice);

  return (
    <div
      className="coverage__row"
      data-haunt-theme={hauntId === undefined ? undefined : hauntTheme(hauntId)}
    >
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
  // The haunt in view names its own attraction types here too, so the
  // coverage bars and the facets above them can't disagree.
  const { hauntId, isAllHaunts } = useHauntScope();
  const registry = useHauntRegistry();
  // Under All Haunts, each haunt's coverage on its own and then combined —
  // Knott's holds far fewer records, and that should be plain to see.
  const perHaunt = isAllHaunts && coverage.byHaunt.length > 1;

  return (
    <Panel elevated padding="lg" className="coverage">
      <h2 className="coverage__title">Review coverage</h2>
      {perHaunt &&
        coverage.byHaunt.map((slice) => (
          <CoverageMeter
            key={slice.hauntId}
            hauntId={slice.hauntId}
            label={`${registry.hauntName(slice.hauntId) ?? slice.hauntId} · ${registry.label("house", slice.hauntId, "many")}`}
            slice={slice}
          />
        ))}
      <CoverageMeter
        label={
          perHaunt
            ? `All Haunts · ${registry.label("house", null, "many")}`
            : registry.label("house", hauntId, "many")
        }
        slice={coverage.houses}
      />
    </Panel>
  );
}
