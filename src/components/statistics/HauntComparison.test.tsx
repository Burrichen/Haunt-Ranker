import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { HauntComparisonRow } from "../../utils/statistics";
import { TestHaunts } from "../../test/hauntRegistry";
import { HauntComparison } from "./HauntComparison";

/**
 * The comparison's whole job is to be readable without being a verdict:
 * sample sizes beside every average, nothing ordered by score, and a haunt
 * too thinly reviewed to average saying so.
 */
const ROWS: HauntComparisonRow[] = [
  {
    hauntId: "hhn",
    reviewedCount: 40,
    attractionCount: 367,
    averages: { total: 11.2, theme: 4, fun: 3.6, fear: 3.6 },
  },
  {
    hauntId: "knotts-scary-farm",
    reviewedCount: 1,
    attractionCount: 12,
    averages: null,
  },
];

describe("HauntComparison", () => {
  it("shows each haunt's averages next to how many reviews they came from", () => {
    render(
      <TestHaunts>
        <HauntComparison rows={ROWS} />
      </TestHaunts>,
    );

    const hhn = screen.getByRole("row", { name: /Halloween Horror Nights/ });
    expect(within(hhn).getByText("40 of 367")).toBeInTheDocument();
    expect(within(hhn).getByText(/11\.2/)).toBeInTheDocument();
  });

  it("says a thinly reviewed haunt can't be averaged instead of averaging it", () => {
    render(
      <TestHaunts>
        <HauntComparison rows={ROWS} />
      </TestHaunts>,
    );

    const knotts = screen.getByRole("row", { name: /Knott's Scary Farm/ });
    expect(within(knotts).getByText("Not enough reviewed to average")).toBeInTheDocument();
    expect(within(knotts).getByText("1 of 12")).toBeInTheDocument();
  });

  it("names no winner, and says to read the averages against their samples", () => {
    render(
      <TestHaunts>
        <HauntComparison rows={ROWS} />
      </TestHaunts>,
    );

    expect(screen.getByText(/rather than as a ranking/)).toBeInTheDocument();
    expect(screen.queryByText(/best|winner|better/i)).not.toBeInTheDocument();
    // Fixed order, not score order.
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("Halloween Horror Nights");
  });

  it("renders nothing at all when no haunt has anything in the slice", () => {
    const { container } = render(
      <TestHaunts>
        <HauntComparison
          rows={ROWS.map((row) => ({
            ...row,
            attractionCount: 0,
            reviewedCount: 0,
            averages: null,
          }))}
        />
      </TestHaunts>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when only one haunt is in the slice, which is no comparison", () => {
    const { container } = render(
      <TestHaunts>
        <HauntComparison
          rows={[ROWS[0], { ...ROWS[1], attractionCount: 0, reviewedCount: 0, averages: null }]}
        />
      </TestHaunts>,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
