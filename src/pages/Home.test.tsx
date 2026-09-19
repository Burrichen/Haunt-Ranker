import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Attraction } from "../models/attraction";
import type { EventYear } from "../models/eventYear";
import { useArchiveOverview } from "../hooks/useArchiveOverview";
import { Home } from "./Home";

vi.mock("../hooks/useArchiveOverview");

const mockedUseArchiveOverview = vi.mocked(useArchiveOverview);

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
    parkIds: ["hollywood", "orlando"],
    isSample: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeEventYear(overrides: Partial<EventYear> = {}): EventYear {
  return {
    id: "y1",
    calendarYear: 2101,
    name: "Shadowfest 2101",
    description: null,
    sourceNotes: null,
    startsOn: null,
    endsOn: null,
    isSample: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  );
}

describe("Home", () => {
  beforeEach(() => {
    mockedUseArchiveOverview.mockReset();
  });

  it("always renders the hero and primary navigation, even while loading", () => {
    mockedUseArchiveOverview.mockReturnValue({
      isLoading: true,
      error: null,
      summary: { totalAttractions: 0, houses: 0, scareZones: 0, reviewed: 0 },
      spotlight: [],
    });

    renderHome();

    expect(screen.getByRole("heading", { name: "Haunt Ranker" })).toBeInTheDocument();
    expect(screen.getByText("Your Halloween Horror Nights archive.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Explore Houses/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Scare Zones/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Years/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Rankings/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Statistics/i })).toBeInTheDocument();
    expect(screen.getByText("Loading the archive…")).toBeInTheDocument();
  });

  it("renders archive progress and spotlight cards once loaded, including the artwork fallback", () => {
    mockedUseArchiveOverview.mockReturnValue({
      isLoading: false,
      error: null,
      summary: { totalAttractions: 7, houses: 4, scareZones: 3, reviewed: 4 },
      spotlight: [
        {
          attraction: makeAttraction({ id: "a1", name: "Moonlight Manor" }),
          eventYear: makeEventYear(),
          posterUrl: null,
          rating: null,
        },
        {
          attraction: makeAttraction({
            id: "a2",
            name: "Pumpkin Pier",
            attractionType: "scare_zone",
            parkIds: ["orlando"],
          }),
          eventYear: makeEventYear(),
          posterUrl: null,
          rating: null,
        },
      ],
    });

    renderHome();

    expect(screen.getByText("From the Archive")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("Attractions")).toBeInTheDocument();
    expect(screen.getByText("Reviewed")).toBeInTheDocument();

    // No posterUrl on either spotlight item — both should render the
    // fallback's name/year/type/park metadata, never a generated image.
    expect(screen.getByRole("heading", { name: "Moonlight Manor" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pumpkin Pier" })).toBeInTheDocument();
    expect(screen.getAllByText("2101").length).toBe(2);
    expect(screen.getByText("House")).toBeInTheDocument();
    expect(screen.getByText("Scare Zone")).toBeInTheDocument();
    expect(screen.getAllByTitle("Orlando").length).toBe(2);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows an empty state when the archive has no attractions yet", () => {
    mockedUseArchiveOverview.mockReturnValue({
      isLoading: false,
      error: null,
      summary: { totalAttractions: 0, houses: 0, scareZones: 0, reviewed: 0 },
      spotlight: [],
    });

    renderHome();

    expect(screen.getByText("Nothing in the archive yet")).toBeInTheDocument();
  });

  it("shows an error state if loading the archive fails", () => {
    mockedUseArchiveOverview.mockReturnValue({
      isLoading: false,
      error: "Database unavailable",
      summary: { totalAttractions: 0, houses: 0, scareZones: 0, reviewed: 0 },
      spotlight: [],
    });

    renderHome();

    expect(screen.getByText("Couldn't load the archive")).toBeInTheDocument();
    expect(screen.getByText("Database unavailable")).toBeInTheDocument();
  });
});
