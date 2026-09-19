import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { Attraction } from "../../models/attraction";
import type { EventYear } from "../../models/eventYear";
import type { Rating } from "../../models/rating";
import { AttractionPreviewCard } from "./AttractionPreviewCard";

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

function makeRating(overrides: Partial<Rating> = {}): Rating {
  return {
    id: "r1",
    attractionId: "a1",
    theme: 4,
    fun: 3.5,
    fear: 4.5,
    total: 12,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderCard(props: Partial<Parameters<typeof AttractionPreviewCard>[0]> = {}) {
  return render(
    <MemoryRouter>
      <AttractionPreviewCard
        attraction={makeAttraction()}
        eventYear={makeEventYear()}
        rating={null}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe("AttractionPreviewCard", () => {
  it("links to the attraction's wiki page", () => {
    renderCard();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/attractions/a1");
  });

  it("shows Not Rated instead of a 0 when there is no rating", () => {
    renderCard({ rating: null });
    expect(screen.getByText("Not Rated")).toBeInTheDocument();
  });

  it("shows Theme/Fun/Fear/Total when a rating exists, each to one decimal", () => {
    renderCard({ rating: makeRating() });
    expect(screen.getByText("Theme")).toBeInTheDocument();
    expect(screen.getByText("Fun")).toBeInTheDocument();
    expect(screen.getByText("Fear")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("12.0")).toBeInTheDocument();
    expect(screen.getByText("3.5")).toBeInTheDocument();
    expect(screen.getByText("4.0")).toBeInTheDocument();
  });

  it("shows the Original/Licensed IP classification when present", () => {
    renderCard({ attraction: makeAttraction({ ipType: "licensed" }) });
    expect(screen.getByText("Licensed IP")).toBeInTheDocument();
  });
});
