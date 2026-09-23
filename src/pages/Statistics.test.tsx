import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Attraction } from "../models/attraction";
import type { EventYear } from "../models/eventYear";
import type { Rating } from "../models/rating";
import { useStatistics, type Statistics as StatisticsState } from "../hooks/useStatistics";
import {
  computeScoreDistribution,
  DEFAULT_STATISTICS_FILTERS,
  type Highlight,
  type TopAttraction,
} from "../utils/statistics";
import { Statistics } from "./Statistics";

// Only the dashboard's data hook is stubbed; `useStatisticsView` stays real so
// the page shell still reads the view out of the URL as it does in the app.
vi.mock("../hooks/useStatistics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../hooks/useStatistics")>()),
  useStatistics: vi.fn(),
}));

const mockedUseStatistics = vi.mocked(useStatistics);

const TIMESTAMPS = {
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function makeAttraction(name: string): Attraction {
  const id = name.toLowerCase().replace(/\s+/g, "-");
  return {
    id,
    eventYearId: "y2101",
    attractionType: "house",
    name,
    slug: id,
    variantName: null,
    ipType: "original",
    franchiseName: null,
    shortSummary: null,
    fullOverview: null,
    storyLore: null,
    experienceDescription: null,
    developmentNotes: null,
    openingDate: null,
    closingDate: null,
    locationNotes: null,
    debutYear: null,
    parkIds: ["hollywood"],
    isSample: true,
    ...TIMESTAMPS,
  };
}

function makeRating(theme: number, fun: number, fear: number): Rating {
  return {
    id: "r1",
    attractionId: "a1",
    theme,
    fun,
    fear,
    total: theme + fun + fear,
    ...TIMESTAMPS,
  };
}

const eventYear: EventYear = {
  id: "y2101",
  calendarYear: 2101,
  hauntId: "hhn",
  name: "Shadowfest 2101",
  description: null,
  sourceNotes: null,
  startsOn: null,
  endsOn: null,
  isSample: true,
  ...TIMESTAMPS,
};

const HIGHLIGHTS: Highlight[] = [
  {
    metric: "total",
    label: "Highest Rated",
    attraction: makeAttraction("Moonlight Manor"),
    rating: makeRating(5, 5, 4),
    value: 14,
  },
  {
    metric: "fear",
    label: "Scariest",
    attraction: makeAttraction("Radioactive Crypt"),
    rating: makeRating(3, 3, 5),
    value: 5,
  },
  {
    metric: "fun",
    label: "Most Fun",
    attraction: makeAttraction("Pumpkin Pier"),
    rating: makeRating(3, 5, 2),
    value: 5,
  },
  {
    metric: "theme",
    label: "Best Theme",
    attraction: makeAttraction("Graveyard Radio"),
    rating: makeRating(5, 4, 4),
    value: 5,
  },
];

const TOP: TopAttraction[] = [
  {
    attraction: makeAttraction("Moonlight Manor"),
    rating: makeRating(5, 5, 4),
    value: 14,
    eventYear,
  },
  {
    attraction: makeAttraction("Pumpkin Pier"),
    rating: makeRating(3, 5, 2),
    value: 10,
    eventYear,
  },
];

function makeState(overrides: Partial<StatisticsState> = {}): StatisticsState {
  return {
    isLoading: false,
    error: null,
    filters: DEFAULT_STATISTICS_FILTERS,
    setFilters: vi.fn(),
    clearFilters: vi.fn(),
    areFiltersActive: false,
    availableYears: [2103, 2101],
    metric: "total",
    setMetric: vi.fn(),
    highlightMode: "best",
    setHighlightMode: vi.fn(),
    highlights: HIGHLIGHTS,
    yearPerformance: [
      {
        calendarYear: 2101,
        eventYearId: "y2101",
        label: "Shadowfest 2101",
        average: 11,
        reviewedCount: 2,
      },
      {
        calendarYear: 2103,
        eventYearId: "y2103",
        label: "Shadowfest 2103",
        average: 13.5,
        reviewedCount: 1,
      },
    ],
    distribution: computeScoreDistribution([]),
    coverage: {
      all: { reviewed: 4, total: 7 },
      houses: { reviewed: 2, total: 4 },
      scareZones: { reviewed: 2, total: 3 },
    },
    topAttractions: TOP,
    attractionCount: 7,
    ...overrides,
  };
}

function renderDashboard(overrides: Partial<StatisticsState> = {}) {
  const state = makeState(overrides);
  mockedUseStatistics.mockReturnValue(state);
  render(
    <MemoryRouter>
      <Statistics />
    </MemoryRouter>,
  );
  return state;
}

describe("Statistics dashboard", () => {
  beforeEach(() => {
    mockedUseStatistics.mockReset();
  });

  it("opens on the dashboard and offers the explorer alongside it", () => {
    renderDashboard();
    const views = within(screen.getByRole("radiogroup", { name: "Statistics view" }));

    expect(views.getByRole("radio", { name: "Dashboard" })).toBeChecked();
    expect(views.getByRole("radio", { name: "Stats Explorer" })).toBeInTheDocument();
    // The dashboard is what's rendered until the explorer is asked for.
    expect(screen.getByRole("region", { name: "Highlights" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Stats Explorer" })).not.toBeInTheDocument();
  });

  describe("global filters", () => {
    it("offers every facet the dashboard can be sliced by, in one row", () => {
      renderDashboard();

      expect(screen.getByRole("radiogroup", { name: "Attraction type" })).toBeInTheDocument();
      expect(screen.getByRole("radiogroup", { name: "Venue" })).toBeInTheDocument();
      expect(screen.getByRole("radiogroup", { name: "Haunt" })).toBeInTheDocument();
      expect(screen.getByRole("radiogroup", { name: "IP classification" })).toBeInTheDocument();
      expect(screen.getByRole("radiogroup", { name: "Metric" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "All years" })).toBeInTheDocument();
    });

    it("filters to a single year", () => {
      const state = renderDashboard();

      fireEvent.click(screen.getByRole("button", { name: "All years" }));
      fireEvent.click(screen.getByRole("menuitem", { name: "2103" }));

      expect(state.setFilters).toHaveBeenCalledWith({
        ...DEFAULT_STATISTICS_FILTERS,
        year: 2103,
      });
    });

    it("filters to houses, a park and an IP classification", () => {
      const state = renderDashboard();
      const type = within(screen.getByRole("radiogroup", { name: "Attraction type" }));
      const park = within(screen.getByRole("radiogroup", { name: "Venue" }));
      const ip = within(screen.getByRole("radiogroup", { name: "IP classification" }));

      fireEvent.click(type.getByRole("radio", { name: "Houses & Mazes" }));
      expect(state.setFilters).toHaveBeenLastCalledWith({
        ...DEFAULT_STATISTICS_FILTERS,
        type: "house",
      });

      fireEvent.click(park.getByRole("radio", { name: "Orlando" }));
      expect(state.setFilters).toHaveBeenLastCalledWith({
        ...DEFAULT_STATISTICS_FILTERS,
        park: "orlando",
      });

      fireEvent.click(ip.getByRole("radio", { name: "Licensed" }));
      expect(state.setFilters).toHaveBeenLastCalledWith({
        ...DEFAULT_STATISTICS_FILTERS,
        ipType: "licensed",
      });
    });

    it("changes the metric that the chart and the Top 10 both read", () => {
      const state = renderDashboard();
      const metric = within(screen.getByRole("radiogroup", { name: "Metric" }));

      fireEvent.click(metric.getByRole("radio", { name: "Fear" }));
      expect(state.setMetric).toHaveBeenCalledWith("fear");
    });

    it("only offers to clear filters once some are set", () => {
      renderDashboard({ areFiltersActive: false });
      expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();

      mockedUseStatistics.mockReset();
      const state = renderDashboard({ areFiltersActive: true });
      fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
      expect(state.clearFilters).toHaveBeenCalledOnce();
    });
  });

  describe("highlights", () => {
    it("shows four cards, each naming an attraction that links to its wiki page", () => {
      renderDashboard();
      const highlights = within(screen.getByRole("region", { name: "Highlights" }));

      expect(highlights.getByText("Highest Rated")).toBeInTheDocument();
      expect(highlights.getByText("Scariest")).toBeInTheDocument();
      expect(highlights.getByText("Most Fun")).toBeInTheDocument();
      expect(highlights.getByText("Best Theme")).toBeInTheDocument();

      expect(highlights.getByRole("link", { name: "Moonlight Manor" })).toHaveAttribute(
        "href",
        "/attractions/moonlight-manor",
      );
    });

    it("toggles to the lowest end rather than showing eight cards at once", () => {
      const state = renderDashboard();
      fireEvent.click(screen.getByRole("radio", { name: "Lowest" }));
      expect(state.setHighlightMode).toHaveBeenCalledWith("lowest");
    });

    it("says so when nothing in the slice is reviewed", () => {
      renderDashboard({ highlights: [] });
      expect(screen.getByText(/no highlights to show/i)).toBeInTheDocument();
    });
  });

  describe("charts", () => {
    it("titles the year chart with the current metric and notes the exclusion rule", () => {
      renderDashboard({ metric: "fear" });

      expect(screen.getByText("Average Fear by year")).toBeInTheDocument();
      expect(screen.getByText("Years with no reviews are left out")).toBeInTheDocument();
    });

    it("calls out the best year in text, so the peak isn't hover-only", () => {
      renderDashboard();
      expect(screen.getByText(/Best year:/)).toBeInTheDocument();
      expect(screen.getByText(/Shadowfest 2103/)).toBeInTheDocument();
      expect(screen.getByText(/from 1 reviewed/)).toBeInTheDocument();
    });

    it("says there is nothing to plot rather than drawing an empty axis", () => {
      renderDashboard({ yearPerformance: [] });
      expect(screen.getByText(/no yearly average to plot/i)).toBeInTheDocument();
    });

    it("heads the distribution with how many reviews it describes", () => {
      renderDashboard();
      expect(screen.getByText("Score distribution")).toBeInTheDocument();
      expect(screen.getByText("4 reviewed, by total out of 15")).toBeInTheDocument();
    });

    it("says so when the distribution has nothing to show", () => {
      renderDashboard({
        coverage: {
          all: { reviewed: 0, total: 3 },
          houses: { reviewed: 0, total: 2 },
          scareZones: { reviewed: 0, total: 1 },
        },
      });
      expect(screen.getByText(/rate an attraction and it shows up here/i)).toBeInTheDocument();
    });
  });

  describe("review coverage", () => {
    it("shows reviewed out of total overall and per type", () => {
      renderDashboard();

      expect(screen.getByRole("progressbar", { name: "All attractions reviewed" })).toHaveAttribute(
        "aria-valuetext",
        "4 of 7 reviewed",
      );
      expect(screen.getByRole("progressbar", { name: "Houses & Mazes reviewed" })).toHaveAttribute(
        "aria-valuetext",
        "2 of 4 reviewed",
      );
      expect(screen.getByRole("progressbar", { name: "Scare Zones reviewed" })).toHaveAttribute(
        "aria-valuetext",
        "2 of 3 reviewed",
      );
    });
  });

  describe("top attractions", () => {
    it("lists them in order with links through to the wiki", () => {
      renderDashboard();
      const rows = within(screen.getByRole("list", { name: "Top attractions" })).getAllByRole(
        "listitem",
      );
      expect(rows[0]).toHaveTextContent("Moonlight Manor");
      expect(rows[0]).toHaveTextContent("14.0");
      expect(rows[1]).toHaveTextContent("Pumpkin Pier");
    });

    it("names the metric it is ranking by", () => {
      renderDashboard({ metric: "theme" });
      expect(screen.getByText("by theme")).toBeInTheDocument();
    });

    it("says so when there is nothing reviewed to rank", () => {
      renderDashboard({ topAttractions: [] });
      expect(screen.getByText(/leaderboard fills in as you rate/i)).toBeInTheDocument();
    });
  });

  it("shows a loading state", () => {
    renderDashboard({ isLoading: true });
    expect(screen.getByText("Loading statistics…")).toBeInTheDocument();
  });

  it("shows an error state", () => {
    renderDashboard({ error: "Database unavailable" });
    expect(screen.getByText("Couldn't load your statistics")).toBeInTheDocument();
    expect(screen.getByText("Database unavailable")).toBeInTheDocument();
  });

  it("distinguishes an empty archive from an over-narrow filter", () => {
    renderDashboard({ attractionCount: 0, areFiltersActive: false });
    expect(screen.getByText("Nothing to measure yet")).toBeInTheDocument();

    mockedUseStatistics.mockReset();
    renderDashboard({ attractionCount: 0, areFiltersActive: true });
    expect(screen.getByText("Nothing matches these filters")).toBeInTheDocument();
  });
});
