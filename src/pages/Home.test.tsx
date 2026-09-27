import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Attraction } from "../models/attraction";
import type { EventYear } from "../models/eventYear";
import { useArchiveOverview } from "../hooks/useArchiveOverview";
import { Home } from "./Home";
import { TestHaunts } from "../test/hauntRegistry";

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
    debutYear: null,
    experienceTypeId: null,
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
    hauntId: "hhn",
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

/** Both haunts, as the Home page's entry points receive them. */
function hauntSummaries() {
  return [
    {
      hauntId: "hhn" as const,
      attractions: 7,
      seasons: 2,
      walkthroughs: 4,
      scareZones: 3,
      reviewed: 4,
      firstYear: 2101,
      lastYear: 2102,
    },
    {
      hauntId: "knotts-scary-farm" as const,
      attractions: 0,
      seasons: 0,
      walkthroughs: 0,
      scareZones: 0,
      reviewed: 0,
      firstYear: null,
      lastYear: null,
    },
  ];
}

function renderHome() {
  return render(
    <TestHaunts>
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    </TestHaunts>,
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
      haunts: hauntSummaries(),
      spotlight: [],
    });

    renderHome();

    // The home collection leads the page by name.
    expect(
      screen.getByRole("heading", { level: 1, name: "Halloween Horror Nights" }),
    ).toBeInTheDocument();
    // Both archives are offered as equals, and neither is hidden behind the other.
    expect(
      screen.getByRole("link", { name: /Open the Halloween Horror Nights archive/i }),
    ).toBeInTheDocument();
    // A second collection is offered, under its own restrained heading,
    // without being made to look like a rival brand.
    expect(screen.getByRole("heading", { name: "Other Haunts" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Open the Knott's Scary Farm archive/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Search every haunt/i })).toBeInTheDocument();
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
      haunts: hauntSummaries(),
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
    const progress = within(screen.getByRole("region", { name: "Archive progress" }));
    expect(progress.getByText("7")).toBeInTheDocument();
    expect(progress.getByText("Attractions")).toBeInTheDocument();
    expect(progress.getByText("Reviewed")).toBeInTheDocument();

    // No posterUrl on either spotlight item — both should render the
    // fallback's name/year/type/park metadata, never a generated image.
    expect(screen.getByRole("heading", { name: "Moonlight Manor" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pumpkin Pier" })).toBeInTheDocument();
    expect(screen.getAllByText("2101").length).toBe(2);
    expect(screen.getByText("House")).toBeInTheDocument();
    expect(screen.getByText("Scare Zone")).toBeInTheDocument();
    expect(screen.getAllByTitle(/Orlando/).length).toBe(2);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows an empty state when the archive has no attractions yet", () => {
    mockedUseArchiveOverview.mockReturnValue({
      isLoading: false,
      error: null,
      summary: { totalAttractions: 0, houses: 0, scareZones: 0, reviewed: 0 },
      haunts: hauntSummaries(),
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
      haunts: hauntSummaries(),
      spotlight: [],
    });

    renderHome();

    expect(screen.getByText("Couldn't load the archive")).toBeInTheDocument();
    expect(screen.getByText("Database unavailable")).toBeInTheDocument();
  });
});
