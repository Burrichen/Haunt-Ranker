import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { HauntScopeProvider } from "../layout/HauntScopeProvider";
import type { Attraction } from "../../models/attraction";
import type { EventYear } from "../../models/eventYear";
import { PREFERENCE_KEYS } from "../../preferences/localPreferences";
import { HauntSelector } from "../layout/HauntSelector";
import { ArchiveCard } from "./ArchiveCard";
import { TestHaunts } from "../../test/hauntRegistry";

const TIMESTAMPS = {
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function makeAttraction(overrides: Partial<Attraction> = {}): Attraction {
  return {
    id: "a1",
    eventYearId: "y1",
    attractionType: "house",
    name: "Dead Exposure",
    slug: "dead-exposure",
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
    parkIds: ["orlando"],
    isSample: false,
    ...TIMESTAMPS,
    ...overrides,
  };
}

function makeEventYear(overrides: Partial<EventYear> = {}): EventYear {
  return {
    id: "y1",
    hauntId: "hhn",
    calendarYear: 2018,
    name: "Halloween Horror Nights 2018",
    description: null,
    sourceNotes: null,
    startsOn: null,
    endsOn: null,
    isSample: false,
    ...TIMESTAMPS,
    ...overrides,
  };
}

function renderCard(attraction: Attraction, eventYear: EventYear) {
  return render(
    <TestHaunts>
      <MemoryRouter>
        <HauntScopeProvider>
          <HauntSelector />
          <ArchiveCard
            attraction={attraction}
            eventYear={eventYear}
            posterUrl={null}
            rating={null}
          />
        </HauntScopeProvider>
      </MemoryRouter>
    </TestHaunts>,
  );
}

describe("ArchiveCard", () => {
  afterEach(() => {
    window.localStorage.removeItem(PREFERENCE_KEYS.hauntScope);
  });

  /** The card itself, away from the selector, which names haunts too. */
  function card() {
    return within(screen.getByRole("link", { name: /Dead Exposure|Widows/ }));
  }

  it("names the haunt when both archives are on screen together", () => {
    renderCard(makeAttraction(), makeEventYear());
    fireEvent.click(screen.getByRole("radio", { name: "All Haunts" }));

    expect(card().getByText("Halloween Horror Nights")).toBeInTheDocument();
    expect(card().getByText("2018")).toBeInTheDocument();
    expect(card().getByRole("heading", { name: "Dead Exposure" })).toBeInTheDocument();
  });

  it("drops the haunt line inside that haunt's own archive, where it's obvious", () => {
    // Halloween Horror Nights is where the app opens, so this is the
    // ordinary case rather than a chosen one.
    renderCard(makeAttraction(), makeEventYear());

    // The selector still says which archive this is; the card stops
    // repeating it on every record.
    expect(card().getByRole("heading", { name: "Dead Exposure" })).toBeInTheDocument();
    expect(card().queryByText("Halloween Horror Nights")).not.toBeInTheDocument();
  });

  it("dates a record by its verified debut where there is one", () => {
    renderCard(
      makeAttraction({ name: "Widows", debutYear: 2024, parkIds: ["knotts-berry-farm"] }),
      makeEventYear({
        hauntId: "knotts-scary-farm",
        calendarYear: 2024,
        name: "Knott's Scary Farm 2024",
      }),
    );
    fireEvent.click(screen.getByRole("radio", { name: "All Haunts" }));

    expect(card().getByText("Knott's Scary Farm")).toBeInTheDocument();
    expect(card().getByText("Debut 2024")).toBeInTheDocument();
    expect(card().getByText("Maze")).toBeInTheDocument();
  });

  it("is one card with both venue icons for an attraction that ran at both", () => {
    renderCard(makeAttraction({ parkIds: ["hollywood", "orlando"] }), makeEventYear());

    // One record, one card, one rating identity — two venues on it.
    expect(screen.getAllByRole("heading", { name: "Dead Exposure" })).toHaveLength(1);
    expect(screen.getByTitle("Ran at Hollywood")).toBeInTheDocument();
    expect(screen.getByTitle("Ran at Orlando")).toBeInTheDocument();
  });
});
