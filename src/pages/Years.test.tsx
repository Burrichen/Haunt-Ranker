import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EventYear } from "../models/eventYear";
import { useYearsOverview, type YearsOverview } from "../hooks/useYearsOverview";
import { buildYearRanking, type YearAverages, type YearSummary } from "../utils/years";
import { DEFAULT_YEAR_SORT } from "../utils/years";
import { Years } from "./Years";

vi.mock("../hooks/useYearsOverview");

const mockedUseYearsOverview = vi.mocked(useYearsOverview);

function makeEventYear(calendarYear: number): EventYear {
  return {
    id: `y${calendarYear}`,
    calendarYear,
    hauntId: "hhn",
    name: `Shadowfest ${calendarYear}`,
    description: null,
    sourceNotes: null,
    startsOn: null,
    endsOn: null,
    isSample: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function makeSummary(calendarYear: number, overrides: Partial<YearSummary> = {}): YearSummary {
  const averages: YearAverages = { theme: 4, fun: 3.5, fear: 3, total: 10.5 };
  return {
    eventYear: makeEventYear(calendarYear),
    artworkUrl: null,
    houseCount: 2,
    scareZoneCount: 1,
    reviewedCount: 2,
    attractionCount: 3,
    averages,
    ...overrides,
  };
}

function makeState(overrides: Partial<YearsOverview> = {}): YearsOverview {
  const summaries = overrides.summaries ?? [makeSummary(2101), makeSummary(2102)];
  return {
    isLoading: false,
    error: null,
    summaries,
    view: "overview",
    setView: vi.fn(),
    sort: DEFAULT_YEAR_SORT,
    setSort: vi.fn(),
    ranking: buildYearRanking(summaries, overrides.sort ?? DEFAULT_YEAR_SORT),
    ...overrides,
  };
}

function renderYears(overrides: Partial<YearsOverview> = {}) {
  const state = makeState(overrides);
  mockedUseYearsOverview.mockReturnValue(state);
  render(
    <MemoryRouter>
      <Years />
    </MemoryRouter>,
  );
  return state;
}

describe("Years", () => {
  beforeEach(() => {
    mockedUseYearsOverview.mockReset();
  });

  describe("overview", () => {
    it("shows a card per year with its name, counts and average", () => {
      renderYears();

      const card = screen.getByRole("link", { name: /Shadowfest 2101/ });
      expect(within(card).getByText("Houses")).toBeInTheDocument();
      expect(within(card).getByText("Scare Zones")).toBeInTheDocument();
      expect(within(card).getByText("Reviewed")).toBeInTheDocument();
      expect(within(card).getByText("Avg 10.5 / 15")).toBeInTheDocument();
      expect(card).toHaveAttribute("href", "/years/y2101");
    });

    it("says so rather than inventing an average when a year is barely reviewed", () => {
      renderYears({
        summaries: [makeSummary(2103, { averages: null, reviewedCount: 1 })],
      });

      expect(screen.getByText("Not enough reviews")).toBeInTheDocument();
      expect(screen.queryByText(/^Avg /)).not.toBeInTheDocument();
    });

    it("shows real artwork when the year has some, and a fallback otherwise", () => {
      renderYears({
        summaries: [
          makeSummary(2101, { artworkUrl: "https://example.invalid/art.jpg" }),
          makeSummary(2102, { artworkUrl: null }),
        ],
      });

      // One image for the year that has artwork; the other renders the
      // fallback rather than a generated stand-in.
      const images = screen.getAllByRole("img");
      expect(images).toHaveLength(1);
      expect(images[0]).toHaveAttribute("src", "https://example.invalid/art.jpg");
    });

    it("offers no sort control — that belongs to the ranking view", () => {
      renderYears({ view: "overview" });
      expect(screen.queryByRole("button", { name: /^Average / })).not.toBeInTheDocument();
    });

    it("switches to the ranking view", () => {
      const state = renderYears();
      fireEvent.click(screen.getByRole("radio", { name: "Year Rankings" }));
      expect(state.setView).toHaveBeenCalledWith("rankings");
    });
  });

  describe("year rankings", () => {
    it("ranks years and shows each one's sample size", () => {
      renderYears({
        view: "rankings",
        summaries: [
          makeSummary(2101, { averages: { theme: 4, fun: 4, fear: 4, total: 12 } }),
          makeSummary(2102, { averages: { theme: 2, fun: 2, fear: 2, total: 6 } }),
        ],
      });

      const rows = screen.getAllByRole("listitem");
      expect(rows[0]).toHaveTextContent("Shadowfest 2101");
      expect(rows[1]).toHaveTextContent("Shadowfest 2102");
      // The sample size travels with every average.
      expect(rows[0]).toHaveTextContent("2 of 3 reviewed");
    });

    it("keeps a barely-reviewed year out of the ranking instead of topping it", () => {
      renderYears({
        view: "rankings",
        summaries: [
          makeSummary(2101, { averages: { theme: 3, fun: 3, fear: 3, total: 9 } }),
          makeSummary(2103, {
            averages: null,
            reviewedCount: 1,
            attractionCount: 4,
          }),
        ],
      });

      const ranked = within(screen.getByRole("list", { name: "Year ranking" })).getAllByRole(
        "listitem",
      );
      expect(ranked).toHaveLength(1);
      expect(ranked[0]).toHaveTextContent("Shadowfest 2101");

      const held = screen.getByRole("region", { name: "Not enough reviews to rank" });
      expect(within(held).getByText(/Shadowfest 2103/)).toBeInTheDocument();
      expect(within(held).getByText("1 of 4 reviewed")).toBeInTheDocument();
    });

    it("offers every metric in both directions", () => {
      renderYears({ view: "rankings" });

      fireEvent.click(screen.getByRole("button", { name: /Average Total high → low/ }));
      for (const label of [
        "Average Total high → low",
        "Average Total low → high",
        "Average Theme high → low",
        "Average Theme low → high",
        "Average Fun high → low",
        "Average Fun low → high",
        "Average Fear high → low",
        "Average Fear low → high",
      ]) {
        expect(screen.getByRole("menuitem", { name: label })).toBeInTheDocument();
      }
    });

    it("changes the sort", () => {
      const state = renderYears({ view: "rankings" });

      fireEvent.click(screen.getByRole("button", { name: /Average Total high → low/ }));
      fireEvent.click(screen.getByRole("menuitem", { name: "Average Fear low → high" }));

      expect(state.setSort).toHaveBeenCalledWith({ metric: "fear", direction: "asc" });
    });

    it("links each ranked year to its page", () => {
      renderYears({ view: "rankings" });
      expect(screen.getByRole("link", { name: /Shadowfest 2101/ })).toHaveAttribute(
        "href",
        "/years/y2101",
      );
    });
  });

  it("shows a loading state", () => {
    renderYears({ isLoading: true });
    expect(screen.getByText("Loading years…")).toBeInTheDocument();
  });

  it("shows an error state", () => {
    renderYears({ error: "Database unavailable", summaries: [] });
    expect(screen.getByText("Couldn't load the years")).toBeInTheDocument();
    expect(screen.getByText("Database unavailable")).toBeInTheDocument();
  });

  it("shows an empty state when the archive has no years", () => {
    renderYears({ summaries: [] });
    expect(screen.getByText("No years yet")).toBeInTheDocument();
  });
});
