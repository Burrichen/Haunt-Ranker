import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useAttractionBrowser,
  type AttractionBrowser as AttractionBrowserState,
} from "../../hooks/useAttractionBrowser";
import { useAttractionViewMode } from "../../hooks/useAttractionViewMode";
import type { Attraction } from "../../models/attraction";
import { DEFAULT_FILTERS, DEFAULT_SORT } from "../../utils/attractionBrowser";
import type { AttractionBrowserRow } from "../../utils/attractionBrowser";
import { AttractionBrowser } from "./AttractionBrowser";

vi.mock("../../hooks/useAttractionBrowser");
vi.mock("../../hooks/useAttractionViewMode");

const mockedUseAttractionBrowser = vi.mocked(useAttractionBrowser);
const mockedUseAttractionViewMode = vi.mocked(useAttractionViewMode);

function makeAttraction(overrides: Partial<Attraction> = {}): Attraction {
  return {
    id: "a1",
    eventYearId: "y1",
    attractionType: "house",
    name: "Moonlight Manor",
    slug: "moonlight-manor",
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
    parkIds: ["hollywood"],
    isSample: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeRow(overrides: Partial<AttractionBrowserRow> = {}): AttractionBrowserRow {
  return {
    attraction: makeAttraction(),
    eventYear: null,
    posterUrl: null,
    rating: null,
    rankingPosition: null,
    ...overrides,
  };
}

function makeBrowserState(overrides: Partial<AttractionBrowserState> = {}): AttractionBrowserState {
  return {
    isLoading: false,
    error: null,
    rows: [],
    availableYears: [2101, 2102],
    hasManualRanking: false,
    filters: DEFAULT_FILTERS,
    setFilters: vi.fn(),
    sort: DEFAULT_SORT,
    setSort: vi.fn(),
    clearFilters: vi.fn(),
    areFiltersActive: false,
    ...overrides,
  };
}

function renderBrowser() {
  return render(
    <MemoryRouter>
      <AttractionBrowser attractionType="house" />
    </MemoryRouter>,
  );
}

describe("AttractionBrowser", () => {
  beforeEach(() => {
    mockedUseAttractionBrowser.mockReset();
    mockedUseAttractionViewMode.mockReset();
    mockedUseAttractionViewMode.mockReturnValue(["card", vi.fn()]);
  });

  it("always renders the toolbar and filter bar", () => {
    mockedUseAttractionBrowser.mockReturnValue(makeBrowserState());
    renderBrowser();

    expect(screen.getByPlaceholderText("Search by name or franchise…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Name \(A–Z\)/i })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "View mode" })).toBeInTheDocument();
    expect(screen.getByText("Park")).toBeInTheDocument();
    expect(screen.getByText("Hollywood")).toBeInTheDocument();
  });

  it("shows a loading state", () => {
    mockedUseAttractionBrowser.mockReturnValue(makeBrowserState({ isLoading: true }));
    renderBrowser();

    expect(screen.getByText("Loading houses…")).toBeInTheDocument();
  });

  it("shows an error state instead of the toolbar's results", () => {
    mockedUseAttractionBrowser.mockReturnValue(makeBrowserState({ error: "Database unavailable" }));
    renderBrowser();

    expect(screen.getByText("Couldn't load the archive")).toBeInTheDocument();
    expect(screen.getByText("Database unavailable")).toBeInTheDocument();
  });

  it("shows a plain empty state when there are no attractions and no filters", () => {
    mockedUseAttractionBrowser.mockReturnValue(makeBrowserState({ rows: [] }));
    renderBrowser();

    expect(screen.getByText("No houses yet")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
  });

  it("shows a 'no matches' empty state when filters are active but empty, with exactly one clear action (the filter bar's)", () => {
    const clearFilters = vi.fn();
    mockedUseAttractionBrowser.mockReturnValue(
      makeBrowserState({ rows: [], areFiltersActive: true, clearFilters }),
    );
    renderBrowser();

    expect(screen.getByText("No matches")).toBeInTheDocument();
    const clearButtons = screen.getAllByRole("button", { name: "Clear filters" });
    expect(clearButtons).toHaveLength(1);
    fireEvent.click(clearButtons[0]);
    expect(clearFilters).toHaveBeenCalledOnce();
  });

  it("renders results as cards by default", () => {
    mockedUseAttractionBrowser.mockReturnValue(
      makeBrowserState({
        rows: [makeRow({ attraction: makeAttraction({ name: "Moonlight Manor" }) })],
      }),
    );
    renderBrowser();

    expect(screen.getByText("1 result")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Moonlight Manor" })).toBeInTheDocument();
  });

  it("renders results as a compact list when that view mode is selected", () => {
    mockedUseAttractionViewMode.mockReturnValue(["compact", vi.fn()]);
    mockedUseAttractionBrowser.mockReturnValue(
      makeBrowserState({
        rows: [makeRow({ attraction: makeAttraction({ name: "Radioactive Crypt" }) })],
      }),
    );
    renderBrowser();

    expect(screen.getByRole("link", { name: /Radioactive Crypt/i })).toBeInTheDocument();
  });

  it("typing in search calls setFilters with the new query", () => {
    const setFilters = vi.fn();
    mockedUseAttractionBrowser.mockReturnValue(makeBrowserState({ setFilters }));
    renderBrowser();

    fireEvent.change(screen.getByPlaceholderText("Search by name or franchise…"), {
      target: { value: "crypt" },
    });

    expect(setFilters).toHaveBeenCalledWith({ ...DEFAULT_FILTERS, query: "crypt" });
  });

  it("clicking a park filter chip toggles it on", () => {
    const setFilters = vi.fn();
    mockedUseAttractionBrowser.mockReturnValue(makeBrowserState({ setFilters }));
    renderBrowser();

    fireEvent.click(screen.getByRole("button", { name: "Hollywood" }));

    expect(setFilters).toHaveBeenCalledWith({ ...DEFAULT_FILTERS, parks: ["hollywood"] });
  });

  it("selecting a sort option from the menu calls setSort", () => {
    const setSort = vi.fn();
    mockedUseAttractionBrowser.mockReturnValue(makeBrowserState({ setSort }));
    renderBrowser();

    fireEvent.click(screen.getByRole("button", { name: /Name \(A–Z\)/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Year (Newest)" }));

    expect(setSort).toHaveBeenCalledWith("year-desc");
  });

  it("hides the Personal Ranking sort option unless a manual ranking exists", () => {
    mockedUseAttractionBrowser.mockReturnValue(makeBrowserState({ hasManualRanking: false }));
    renderBrowser();

    fireEvent.click(screen.getByRole("button", { name: /Name \(A–Z\)/i }));
    expect(screen.queryByRole("menuitem", { name: "Personal Ranking" })).not.toBeInTheDocument();
  });

  it("shows the Personal Ranking sort option once a manual ranking exists", () => {
    mockedUseAttractionBrowser.mockReturnValue(makeBrowserState({ hasManualRanking: true }));
    renderBrowser();

    fireEvent.click(screen.getByRole("button", { name: /Name \(A–Z\)/i }));
    expect(screen.getByRole("menuitem", { name: "Personal Ranking" })).toBeInTheDocument();
  });
});
