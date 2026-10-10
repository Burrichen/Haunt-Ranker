import { hauntTheme } from "../../models/hauntTheme";

/**
 * Shared chart chrome, so both charts read as one system.
 *
 * A single-series chart has one mark colour, the haunt theme's `--series`:
 * HHN orange, Knott's plum, or the neutral brass when All Haunts is in view.
 * Everything else (grid, axes, labels) is deliberately recessive: the data is
 * the only loud thing.
 */
export const CHART_MARK = "var(--series)";

/**
 * Where a chart splits by haunt, each haunt's series wears that haunt's
 * colour — colour follows the entity, never its rank or order. The pair was
 * run through the dataviz palette validator against the panel (#1a151a) and
 * passes every check: lightness, chroma, CVD separation (ΔE 20.6), contrast.
 * Ghost green is deliberately not a series colour (it fails the chroma floor).
 */
export function hauntSeriesColor(hauntId: string): string {
  const theme = hauntTheme(hauntId);
  return theme === "hhn"
    ? "var(--color-orange)"
    : theme === "knotts"
      ? "var(--color-plum)"
      : "var(--series)";
}

/** The panel the charts sit on — used for the rings that separate overlapping marks. */
export const CHART_SURFACE = "var(--color-bg-1)";

/* Hairline and solid, never dashed — a grid should be readable without
   becoming another thing competing with the data. The faintest border token
   disappears entirely against the near-black panel, so this is the next step up. */
export const CHART_GRID = "var(--color-border)";
export const CHART_AXIS_LINE = "var(--color-border)";
export const CHART_AXIS_TEXT = "var(--color-text-tertiary)";
export const CHART_LABEL_TEXT = "var(--color-text-secondary)";

export const AXIS_TICK = { fill: CHART_AXIS_TEXT, fontSize: 11 } as const;

/** Bars never fill their slot — the leftover band is the breathing room. */
export const MAX_BAR_SIZE = 24;

/** 4px rounded data-end, square where it meets the baseline. */
export const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];
