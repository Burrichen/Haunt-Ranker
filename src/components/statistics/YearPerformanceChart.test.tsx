import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TestHaunts } from "../../test/hauntRegistry";
import type { YearPerformancePoint } from "../../utils/statistics";
import { YearPerformanceChart } from "./YearPerformanceChart";

const point = (hauntId: string, year: number, average: number): YearPerformancePoint => ({
  calendarYear: year,
  hauntId,
  eventYearId: `${hauntId}-${year}`,
  label: `${hauntId} ${year}`,
  average,
  reviewedCount: 3,
});

function renderChart(points: YearPerformancePoint[]) {
  return render(
    <TestHaunts>
      <YearPerformanceChart points={points} metric="total" />
    </TestHaunts>,
  );
}

describe("YearPerformanceChart", () => {
  it("plots one haunt as a single series, with no legend", () => {
    renderChart([point("hhn", 2023, 10), point("hhn", 2024, 11)]);
    expect(screen.queryByRole("list", { name: "Series" })).not.toBeInTheDocument();
  });

  it("names each haunt in a legend, in its own colour, when both are in the slice", () => {
    renderChart([point("hhn", 2024, 10), point("knotts-scary-farm", 2024, 12)]);

    const legend = screen.getByRole("list", { name: "Series" });
    const keys = [...legend.querySelectorAll<HTMLElement>(".chart-legend__key")];
    expect(legend).toHaveTextContent("Halloween Horror Nights");
    expect(legend).toHaveTextContent("Knott's Scary Farm");
    expect(keys.map((key) => key.style.backgroundColor)).toEqual([
      "var(--color-orange)",
      "var(--color-plum)",
    ]);
  });
});
