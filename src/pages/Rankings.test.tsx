import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Attraction } from "../models/attraction";
import type { EventYear } from "../models/eventYear";
import type { Rating } from "../models/rating";
import { useRankings, type Rankings as RankingsState } from "../hooks/useRankings";
import { DEFAULT_RANKING_FILTERS, DEFAULT_RANKING_SORT, type RankingRow } from "../utils/rankings";
import { Rankings } from "./Rankings";

vi.mock("../hooks/useRankings");

const mockedUseRankings = vi.mocked(useRankings);

const TIMESTAMPS = {
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function makeRow(name: string, scores: [number, number, number] | null): RankingRow {
  const id = name.toLowerCase().replace(/\s+/g, "-");
  const attraction: Attraction = {
    id,
    eventYearId: "y1",
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
  const eventYear: EventYear = {
    id: "y1",
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
  const rating: Rating | null = scores
    ? {
        id: `r-${id}`,
        attractionId: id,
        theme: scores[0],
        fun: scores[1],
        fear: scores[2],
        total: scores[0] + scores[1] + scores[2],
        ...TIMESTAMPS,
      }
    : null;

  return { attraction, eventYear, rating };
}

function makeState(overrides: Partial<RankingsState> = {}): RankingsState {
  return {
    isLoading: false,
    error: null,
    group: "houses",
    setGroup: vi.fn(),
    haunt: "all",
    setHaunt: vi.fn(),
    mode: "calculated",
    setMode: vi.fn(),
    hasManualRanking: false,
    filters: DEFAULT_RANKING_FILTERS,
    setFilters: vi.fn(),
    clearFilters: vi.fn(),
    areFiltersActive: false,
    availableYears: [2101],
    sort: DEFAULT_RANKING_SORT,
    setSort: vi.fn(),
    ranked: [makeRow("Best House", [5, 5, 5]), makeRow("Worst House", [1, 1, 1])],
    unplaced: [],
    unrated: [],
    isSaving: false,
    saveError: null,
    reorder: vi.fn().mockResolvedValue(undefined),
    addToRanking: vi.fn().mockResolvedValue(undefined),
    resetToCalculated: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function renderRankings(overrides: Partial<RankingsState> = {}) {
  const state = makeState(overrides);
  mockedUseRankings.mockReturnValue(state);
  render(
    <MemoryRouter>
      <Rankings />
    </MemoryRouter>,
  );
  return state;
}

/** The ranking proper, excluding the collapsible side sections. */
function rankedItems() {
  return within(screen.getByRole("list")).getAllByRole("listitem");
}

describe("Rankings", () => {
  beforeEach(() => {
    mockedUseRankings.mockReset();
  });

  it("lists the ranking in order with positions, names and totals", () => {
    renderRankings();

    const items = rankedItems();
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("1");
    expect(items[0]).toHaveTextContent("Best House");
    expect(items[0]).toHaveTextContent("15.0");
    expect(items[1]).toHaveTextContent("2");
    expect(items[1]).toHaveTextContent("Worst House");
  });

  it("shows each row's year, Theme/Fun/Fear and a link to the wiki article", () => {
    renderRankings();

    const first = rankedItems()[0];
    expect(within(first).getByText("2101")).toBeInTheDocument();
    expect(within(first).getByText("Theme")).toBeInTheDocument();
    expect(within(first).getByText("Fun")).toBeInTheDocument();
    expect(within(first).getByText("Fear")).toBeInTheDocument();
    expect(within(first).getByRole("link")).toHaveAttribute("href", "/attractions/best-house");
  });

  it("offers both ranking concepts and all four metrics in each direction", () => {
    renderRankings();

    expect(screen.getByRole("radio", { name: "Calculated" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "My Ranking" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Total high → low/ }));
    for (const label of [
      "Total high → low",
      "Total low → high",
      "Theme high → low",
      "Theme low → high",
      "Fun high → low",
      "Fun low → high",
      "Fear high → low",
      "Fear low → high",
    ]) {
      expect(screen.getByRole("menuitem", { name: label })).toBeInTheDocument();
    }
  });

  it("changes the exploratory sort without touching any saved order", () => {
    const state = renderRankings({ hasManualRanking: true });

    fireEvent.click(screen.getByRole("button", { name: /Total high → low/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Fear low → high" }));

    expect(state.setSort).toHaveBeenCalledWith({ metric: "fear", direction: "asc" });
    expect(state.reorder).not.toHaveBeenCalled();
    expect(state.resetToCalculated).not.toHaveBeenCalled();
  });

  it("switches ranking group", () => {
    const state = renderRankings();
    fireEvent.click(screen.getByRole("radio", { name: "All Attractions" }));
    expect(state.setGroup).toHaveBeenCalledWith("all");
  });

  it("only offers the House/Scare Zone filter on the All Attractions group", () => {
    renderRankings({ group: "houses" });
    expect(screen.queryByText("Type")).not.toBeInTheDocument();

    mockedUseRankings.mockReset();
    renderRankings({ group: "all" });
    expect(screen.getByText("Type")).toBeInTheDocument();
  });

  it("filters by park", () => {
    const state = renderRankings();
    fireEvent.click(screen.getByRole("button", { name: "Hollywood" }));
    expect(state.setFilters).toHaveBeenCalledWith({
      ...DEFAULT_RANKING_FILTERS,
      parks: ["hollywood"],
    });
  });

  describe("calculated mode with a saved manual ranking", () => {
    it("says the saved ranking is untouched and offers a way back to it", () => {
      const state = renderRankings({ mode: "calculated", hasManualRanking: true });

      expect(screen.getByText(/never changes it/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Back to My Ranking" }));
      expect(state.setMode).toHaveBeenCalledWith("manual");
    });

    it("offers no reorder controls", () => {
      renderRankings({ mode: "calculated", hasManualRanking: true });
      expect(screen.queryByRole("button", { name: /Move .* up/ })).not.toBeInTheDocument();
    });
  });

  describe("manual mode", () => {
    it("marks the order as manual and offers a reset", () => {
      renderRankings({ mode: "manual", hasManualRanking: true });

      expect(screen.getByText("Manual order active")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Reset to Calculated Ranking/ }),
      ).toBeInTheDocument();
    });

    it("says the order isn't saved yet before the first reorder", () => {
      renderRankings({ mode: "manual", hasManualRanking: false });

      expect(screen.getByText("Manual order — not saved yet")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Reset to Calculated Ranking/ }),
      ).not.toBeInTheDocument();
    });

    it("reorders from the keyboard-accessible arrows", () => {
      const state = renderRankings({ mode: "manual", hasManualRanking: true });

      fireEvent.click(screen.getByRole("button", { name: "Move Worst House up" }));
      expect(state.reorder).toHaveBeenCalledWith(1, 0);

      fireEvent.click(screen.getByRole("button", { name: "Move Best House down" }));
      expect(state.reorder).toHaveBeenCalledWith(0, 1);
    });

    it("cannot move the first row up or the last row down", () => {
      renderRankings({ mode: "manual", hasManualRanking: true });

      expect(screen.getByRole("button", { name: "Move Best House up" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Move Worst House down" })).toBeDisabled();
    });

    it("reorders by dragging one row onto another", () => {
      const state = renderRankings({ mode: "manual", hasManualRanking: true });
      const items = rankedItems();

      const dragged = items[1].querySelector(".ranking-row__inner");
      const target = items[0].querySelector(".ranking-row__inner");
      expect(dragged).not.toBeNull();
      expect(target).not.toBeNull();

      fireEvent.dragStart(dragged as Element);
      fireEvent.dragOver(target as Element);
      fireEvent.drop(target as Element);

      expect(state.reorder).toHaveBeenCalledWith(1, 0);
    });

    it("resets only after confirmation", async () => {
      const state = renderRankings({ mode: "manual", hasManualRanking: true });

      fireEvent.click(screen.getByRole("button", { name: /Reset to Calculated Ranking/ }));
      const dialog = within(screen.getByRole("dialog"));
      expect(dialog.getByText("Reset to Calculated Ranking?")).toBeInTheDocument();

      fireEvent.click(dialog.getByRole("button", { name: "Cancel" }));
      expect(state.resetToCalculated).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: /Reset to Calculated Ranking/ }));
      fireEvent.click(
        within(screen.getByRole("dialog")).getByRole("button", { name: "Reset ranking" }),
      );
      await waitFor(() => expect(state.resetToCalculated).toHaveBeenCalledOnce());
    });

    it("cannot sort by a metric while the order is the user's own", () => {
      renderRankings({ mode: "manual", hasManualRanking: true });

      const sortButton = screen.getByRole("button", { name: /My Ranking order/ });
      expect(sortButton).toBeDisabled();
    });
  });

  describe("attractions outside the ranking", () => {
    it("keeps unrated attractions in their own collapsed section, not in the ranking", () => {
      renderRankings({ unrated: [makeRow("Unrated House", null)] });

      expect(rankedItems()).toHaveLength(2);
      expect(screen.queryByText("Unrated House")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /Unrated/ }));
      expect(screen.getByText("Unrated House")).toBeInTheDocument();
      expect(screen.getByText(/isn't a zero/i)).toBeInTheDocument();
    });

    it("lists newly-rated attractions as not yet placed, and can add one to the ranking", () => {
      const state = renderRankings({
        mode: "manual",
        hasManualRanking: true,
        unplaced: [makeRow("Newcomer", [4, 4, 4])],
      });

      fireEvent.click(screen.getByRole("button", { name: /Not yet placed/ }));
      expect(screen.getByText("Newcomer")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /Add to ranking/ }));
      expect(state.addToRanking).toHaveBeenCalledWith("newcomer");
    });
  });

  describe("hovering an entry", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("shows the shared attraction preview card after the hover delay", () => {
      renderRankings();
      const row = rankedItems()[0];
      expect(row.querySelector(".attraction-hover-preview__popup")).toBeNull();

      // The whole row body is the hover target, not just the name.
      fireEvent.mouseEnter(row.querySelector(".ranking-row__inner") as Element);
      act(() => {
        vi.advanceTimersByTime(400);
      });

      const popup = row.querySelector(".attraction-hover-preview__popup");
      expect(popup).not.toBeNull();
      // The preview carries the full breakdown, not just what the row shows.
      expect(within(popup as HTMLElement).getByText("Total")).toBeInTheDocument();
    });
  });

  it("shows a loading state", () => {
    renderRankings({ isLoading: true });
    expect(screen.getByText("Loading your rankings…")).toBeInTheDocument();
  });

  it("shows an error state", () => {
    renderRankings({ error: "Database unavailable", ranked: [] });
    expect(screen.getByText("Couldn't load your rankings")).toBeInTheDocument();
    expect(screen.getByText("Database unavailable")).toBeInTheDocument();
  });

  it("surfaces a failure to save the order", () => {
    renderRankings({ mode: "manual", saveError: "Disk is full" });
    expect(screen.getByRole("alert")).toHaveTextContent("Disk is full");
  });

  it("explains an empty ranking differently when filters are to blame", () => {
    renderRankings({ ranked: [], areFiltersActive: false });
    expect(screen.getByText("Nothing to rank yet")).toBeInTheDocument();

    mockedUseRankings.mockReset();
    renderRankings({ ranked: [], areFiltersActive: true });
    expect(screen.getByText("No matches")).toBeInTheDocument();
  });
});
