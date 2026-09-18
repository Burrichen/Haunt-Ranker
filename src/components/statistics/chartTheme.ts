/**
 * Shared chart chrome, so both charts read as one system.
 *
 * There is exactly one mark colour. Each chart plots a single series, so
 * colour carries no identity here — it's just "this is the data". The hue is
 * the app's existing orange token, checked against the panel surface for
 * contrast and lightness rather than picked by eye. Everything else (grid,
 * axes, labels) is deliberately recessive: the data is the only loud thing.
 */
export const CHART_MARK = "var(--color-orange)";

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
