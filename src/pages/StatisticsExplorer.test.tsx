import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Attraction } from "../models/attraction";
import type { EventYear } from "../models/eventYear";
import type { Rating } from "../models/rating";
import {
  useStatisticsExplorer,
  type StatisticsExplorer as ExplorerState,
} from "../hooks/useStatisticsExplorer";
import { DEFAULT_STATISTICS_FILTERS, type StatisticsRow } from "../utils/statistics";
import type { ExplorerAttractionRow } from "../utils/statisticsExplorer";
import { StatisticsExplorer } from "./StatisticsExplorer";

vi.mock("../hooks/useStatisticsExplorer");

const mockedUseExplorer = vi.mocked(useStatisticsExplorer);

const TIMESTAMPS = {
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const eventYear: EventYear = {
  id: "y2101",
  calendarYear: 2101,
  name: "Shadowfest 2101",
  description: null,
  sourceNotes: null,
  isSample: true,
  ...TIMESTAMPS,
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
    parkIds: ["hollywood", "orlando"],
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

function makeRankedRow(name: string, rank: number, value: number): ExplorerAttractionRow {
  return {
    rank,
    attraction: makeAttraction(name),
    eventYear,
    rating: makeRating(4, 3, 5),
    value,
  };
}

const UNRATED_ROW: StatisticsRow = {
  attraction: makeAttraction("Unrated House"),
  eventYear,
  rating: null,
};

function makeState(overrides: Partial<ExplorerState> = {}): ExplorerState {
  return {
    isLoading: false,
    error: null,
    subject: "attractions",
    setSubject: vi.fn(),
    filters: DEFAULT_STATISTICS_FILTERS,
    setFilters: vi.fn(),
    clearFilters: vi.fn(),
    areFiltersActive: false,
    availableYears: [2103, 2101],
    metric: "total",
    setMetric: vi.fn(),
    direction: "desc",
    setDirection: vi.fn(),
    reviewedOnly: true,
    setReviewedOnly: vi.fn(),
    attractionResult: {
      ranked: [makeRankedRow("Terror House", 1, 12), makeRankedRow("Gentle House", 2, 10)],
      unrated: [],
      matchCount: 2,
    },
    yearRows: [
      {
        rank: 1,
        calendarYear: 2101,
        eventYearId: "y2101",
        label: "Shadowfest 2101",
        average: 11,
        reviewedCount: 4,
      },
      {
        rank: 2,
        calendarYear: 2103,
        eventYearId: "y2103",
        label: "Shadowfest 2103",
        average: 9.5,
        reviewedCount: 1,
      },
    ],
    ...overrides,
  };
}

function renderExplorer(overrides: Partial<ExplorerState> = {}) {
  const state = makeState(overrides);
  mockedUseExplorer.mockReturnValue(state);
  render(
    <MemoryRouter>
      <StatisticsExplorer />
    </MemoryRouter>,
  );
  return state;
}

describe("StatisticsExplorer", () => {
  beforeEach(() => {
    mockedUseExplorer.mockReset();
  });

  describe("controls", () => {
    it("exposes the whole query in one row", () => {
      renderExplorer();

      expect(screen.getByRole("radiogroup", { name: "What to rank" })).toBeInTheDocument();
      expect(screen.getByRole("radiogroup", { name: "Metric" })).toBeInTheDocument();
      expect(screen.getByRole("radiogroup", { name: "Direction" })).toBeInTheDocument();
      expect(screen.getByRole("radiogroup", { name: "Attraction type" })).toBeInTheDocument();
      expect(screen.getByRole("radiogroup", { name: "Park" })).toBeInTheDocument();
      expect(screen.getByRole("radiogroup", { name: "IP classification" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "All years" })).toBeInTheDocument();
    });

    it("offers both directions", () => {
      const state = renderExplorer();
      const direction = within(screen.getByRole("radiogroup", { name: "Direction" }));

      expect(direction.getByRole("radio", { name: "Highest → Lowest" })).toBeInTheDocument();
      fireEvent.click(direction.getByRole("radio", { name: "Lowest → Highest" }));
      expect(state.setDirection).toHaveBeenCalledWith("asc");
    });

    it("switches metric", () => {
      const state = renderExplorer();
      fireEvent.click(
        within(screen.getByRole("radiogroup", { name: "Metric" })).getByRole("radio", {
          name: "Fear",
        }),
      );
      expect(state.setMetric).toHaveBeenCalledWith("fear");
    });

    it("switches between ranking attractions and ranking years", () => {
      const state = renderExplorer();
      fireEvent.click(
        within(screen.getByRole("radiogroup", { name: "What to rank" })).getByRole("radio", {
          name: "Years",
        }),
      );
      expect(state.setSubject).toHaveBeenCalledWith("years");
    });

    it("filters by year, type, park and IP", () => {
      const state = renderExplorer();

      fireEvent.click(screen.getByRole("button", { name: "All years" }));
      fireEvent.click(screen.getByRole("menuitem", { name: "2103" }));
      expect(state.setFilters).toHaveBeenLastCalledWith({
        ...DEFAULT_STATISTICS_FILTERS,
        year: 2103,
      });

      fireEvent.click(
        within(screen.getByRole("radiogroup", { name: "Attraction type" })).getByRole("radio", {
          name: "Scare Zones",
        }),
      );
      expect(state.setFilters).toHaveBeenLastCalledWith({
        ...DEFAULT_STATISTICS_FILTERS,
        type: "scare_zone",
      });
    });

    it("toggles whether unrated matches are listed", () => {
      const state = renderExplorer({ reviewedOnly: true });
      fireEvent.click(screen.getByRole("button", { name: "Show unrated matches" }));
      expect(state.setReviewedOnly).toHaveBeenCalledWith(false);
    });

    it("hides the unrated toggle when ranking years, where it means nothing", () => {
      renderExplorer({ subject: "years" });
      expect(
        screen.queryByRole("button", { name: "Show unrated matches" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("attraction results", () => {
    it("shows rank, attraction, year, parks and the ranked metric", () => {
      renderExplorer();

      const rows = screen.getAllByRole("row");
      // Header plus two results.
      expect(rows).toHaveLength(3);
      expect(rows[1]).toHaveTextContent("1");
      expect(rows[1]).toHaveTextContent("Terror House");
      expect(rows[1]).toHaveTextContent("2101");
      expect(rows[1]).toHaveTextContent("12.0");
      expect(within(rows[1]).getAllByTitle("Hollywood").length).toBe(1);
      expect(within(rows[1]).getAllByTitle("Orlando").length).toBe(1);
    });

    it("links each attraction to its wiki page", () => {
      renderExplorer();
      expect(screen.getByRole("link", { name: "Terror House" })).toHaveAttribute(
        "href",
        "/attractions/terror-house",
      );
    });

    it("does not repeat the total column when the total is what's being ranked", () => {
      renderExplorer({ metric: "total" });
      expect(screen.getAllByRole("columnheader", { name: "Total" })).toHaveLength(1);
    });

    it("shows the total alongside the metric when ranking by a single dimension", () => {
      renderExplorer({ metric: "fear" });
      expect(screen.getByRole("columnheader", { name: "Fear" })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "Total" })).toBeInTheDocument();
    });

    it("lists unrated matches apart from the ranking, without a rank", () => {
      renderExplorer({
        reviewedOnly: false,
        attractionResult: {
          ranked: [makeRankedRow("Terror House", 1, 12)],
          unrated: [UNRATED_ROW],
          matchCount: 2,
        },
      });

      expect(screen.getByText(/Not rated \(1\)/)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Unrated House" })).toBeInTheDocument();
      expect(screen.getByText("Not Rated")).toBeInTheDocument();
    });

    it("distinguishes nothing matching from nothing reviewed", () => {
      renderExplorer({
        attractionResult: { ranked: [], unrated: [], matchCount: 0 },
      });
      expect(screen.getByText(/Nothing matches these filters/)).toBeInTheDocument();

      mockedUseExplorer.mockReset();
      renderExplorer({
        attractionResult: { ranked: [], unrated: [], matchCount: 3 },
      });
      expect(screen.getByText(/Nothing matching has been reviewed yet/)).toBeInTheDocument();
    });
  });

  describe("year results", () => {
    it("ranks years and shows the review count behind every average", () => {
      renderExplorer({ subject: "years" });

      expect(screen.getByRole("columnheader", { name: "Reviews" })).toBeInTheDocument();
      const rows = screen.getAllByRole("row");
      expect(rows[1]).toHaveTextContent("Shadowfest 2101");
      expect(rows[1]).toHaveTextContent("11.0");
      expect(rows[1]).toHaveTextContent("4");
      // A one-review year is still shown, but never without its count.
      expect(rows[2]).toHaveTextContent("Shadowfest 2103");
      expect(rows[2]).toHaveTextContent("1");
    });

    it("names the metric being averaged", () => {
      renderExplorer({ subject: "years", metric: "fun" });
      expect(screen.getByRole("columnheader", { name: "Avg Fun" })).toBeInTheDocument();
    });

    it("links each year to its page", () => {
      renderExplorer({ subject: "years" });
      expect(screen.getByRole("link", { name: "Shadowfest 2101" })).toHaveAttribute(
        "href",
        "/years/y2101",
      );
    });

    it("says so when no year has a matching review", () => {
      renderExplorer({ subject: "years", yearRows: [] });
      expect(screen.getByText(/no averages to rank/i)).toBeInTheDocument();
    });
  });

  describe("hovering a result", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("shows the shared attraction preview card", () => {
      renderExplorer();
      const link = screen.getByRole("link", { name: "Terror House" });

      fireEvent.mouseEnter(link);
      act(() => {
        vi.advanceTimersByTime(400);
      });

      const popup = document.querySelector(".attraction-hover-preview__popup");
      expect(popup).not.toBeNull();
      expect(within(popup as HTMLElement).getByText("Total")).toBeInTheDocument();
    });
  });

  it("shows a loading state", () => {
    renderExplorer({ isLoading: true });
    expect(screen.getByText("Loading the archive…")).toBeInTheDocument();
  });

  it("shows an error state", () => {
    renderExplorer({ error: "Database unavailable" });
    expect(screen.getByText("Couldn't load the archive")).toBeInTheDocument();
  });
});
