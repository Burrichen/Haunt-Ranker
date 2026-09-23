import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Attraction, AttractionType } from "../models/attraction";
import type { EventYear } from "../models/eventYear";
import type { Rating } from "../models/rating";
import { useYearArchive, type YearArchive as YearArchiveState } from "../hooks/useYearArchive";
import { computeYearStats, type YearAttraction } from "../utils/years";
import { YearArchive } from "./YearArchive";

vi.mock("../hooks/useYearArchive");

const mockedUseYearArchive = vi.mocked(useYearArchive);

const TIMESTAMPS = {
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function makeEventYear(overrides: Partial<EventYear> = {}): EventYear {
  return {
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
    ...overrides,
  };
}

function makeItem(
  name: string,
  scores: [number, number, number] | null,
  attractionType: AttractionType = "house",
): YearAttraction {
  const id = name.toLowerCase().replace(/\s+/g, "-");
  const attraction: Attraction = {
    id,
    eventYearId: "y2101",
    attractionType,
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

  return { attraction, rating, posterUrl: null };
}

function makeState(overrides: Partial<YearArchiveState> = {}): YearArchiveState {
  const houses = overrides.houses ?? [
    makeItem("Moonlight Manor", [5, 4, 3]),
    makeItem("Radioactive Crypt", [2, 2, 2]),
  ];
  const scareZones = overrides.scareZones ?? [makeItem("Pumpkin Pier", null, "scare_zone")];

  return {
    isLoading: false,
    error: null,
    notFound: false,
    eventYear: makeEventYear(),
    artworkUrl: null,
    houses,
    scareZones,
    lineage: { newThisYear: [], returning: [], unclassified: [], isIncomplete: false },
    stats: computeYearStats([...houses, ...scareZones]),
    ...overrides,
  };
}

function renderYear(overrides: Partial<YearArchiveState> = {}) {
  mockedUseYearArchive.mockReturnValue(makeState(overrides));
  render(
    <MemoryRouter initialEntries={["/years/y2101"]}>
      <Routes>
        <Route path="/years/:eventYearId" element={<YearArchive />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("YearArchive", () => {
  beforeEach(() => {
    mockedUseYearArchive.mockReset();
  });

  it("heads the page with the event name, year and attraction counts", () => {
    renderYear();

    expect(screen.getByRole("heading", { name: "Shadowfest 2101" })).toBeInTheDocument();
    expect(screen.getByText("2 Houses")).toBeInTheDocument();
    expect(screen.getByText("1 Scare Zone")).toBeInTheDocument();
  });

  it("shows the event description when there is one", () => {
    renderYear({
      eventYear: makeEventYear({ description: "A fictional stand-in event." }),
    });

    expect(screen.getByText("A fictional stand-in event.")).toBeInTheDocument();
  });

  it("shows real event artwork when it exists, and never invents any when it doesn't", () => {
    renderYear({ artworkUrl: "https://example.invalid/event.jpg" });
    expect(screen.getByRole("img", { name: /Shadowfest 2101 artwork/ })).toBeInTheDocument();
  });

  it("lists houses and scare zones as archive cards linking to their wiki pages", () => {
    renderYear();

    const houses = screen.getByRole("region", { name: "Houses" });
    expect(within(houses).getByRole("heading", { name: "Moonlight Manor" })).toBeInTheDocument();
    expect(within(houses).getByRole("link", { name: /Moonlight Manor/ })).toHaveAttribute(
      "href",
      "/attractions/moonlight-manor",
    );

    const zones = screen.getByRole("region", { name: "Scare Zones" });
    expect(within(zones).getByRole("heading", { name: "Pumpkin Pier" })).toBeInTheDocument();
  });

  it("says when a section has nothing in it", () => {
    renderYear({ scareZones: [] });
    expect(screen.getByText("No scare zones on file for this year yet.")).toBeInTheDocument();
  });

  describe("statistics", () => {
    it("averages the reviewed attractions and shows the sample size beside them", () => {
      renderYear();

      // Two reviewed of three: (12 + 6) / 2 = 9.
      expect(screen.getByText("from 2 of 3 reviewed")).toBeInTheDocument();
      expect(screen.getByText("Avg Total")).toBeInTheDocument();
      expect(screen.getByText("9.0")).toBeInTheDocument();
      expect(screen.getByText("Avg Theme")).toBeInTheDocument();
      expect(screen.getByText("Avg Fun")).toBeInTheDocument();
      expect(screen.getByText("Avg Fear")).toBeInTheDocument();
    });

    it("names every superlative, each linking to its wiki article", () => {
      renderYear();

      for (const label of [
        "Highest Rated",
        "Lowest Rated",
        "Best Theme",
        "Lowest Theme",
        "Most Fun",
        "Least Fun",
        "Scariest",
        "Least Scary",
      ]) {
        expect(screen.getByText(label)).toBeInTheDocument();
      }

      const stats = screen.getByText("Highest Rated").closest("li");
      expect(within(stats as HTMLElement).getByRole("link")).toHaveAttribute(
        "href",
        "/attractions/moonlight-manor",
      );
    });

    it("says it hasn't enough data rather than inventing values", () => {
      renderYear({
        houses: [makeItem("Only Rated One", [5, 5, 5])],
        scareZones: [makeItem("Unrated Zone", null, "scare_zone")],
      });

      expect(screen.getByText(/Not enough reviewed attractions/)).toBeInTheDocument();
      expect(screen.getByText(/1 of 2 reviewed/)).toBeInTheDocument();
      expect(screen.queryByText("Avg Total")).not.toBeInTheDocument();
      expect(screen.queryByText("Highest Rated")).not.toBeInTheDocument();
    });
  });

  describe("hovering a highlighted attraction", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("shows the shared attraction preview card", () => {
      renderYear();
      const row = screen.getByText("Highest Rated").closest("li") as HTMLElement;

      fireEvent.mouseEnter(within(row).getByRole("link"));
      act(() => {
        vi.advanceTimersByTime(400);
      });

      const popup = row.querySelector(".attraction-hover-preview__popup");
      expect(popup).not.toBeNull();
      expect(within(popup as HTMLElement).getByText("Total")).toBeInTheDocument();
    });
  });

  describe("a Knott's season", () => {
    const knottsSeason = makeEventYear({
      id: "knotts-2024",
      hauntId: "knotts-scary-farm",
      calendarYear: 2024,
      name: "Knott's Scary Farm 2024",
    });

    it("reads the season as what was new and what came back", () => {
      const newOne = makeItem("Widows", null);
      const returning = makeItem("Dark Entities", null);
      renderYear({
        eventYear: knottsSeason,
        houses: [newOne, returning],
        lineage: {
          newThisYear: [newOne],
          returning: [returning],
          unclassified: [],
          isIncomplete: false,
        },
      });

      const lineage = within(screen.getByRole("region", { name: "New and returning" }));
      expect(lineage.getByRole("heading", { name: "New This Year" })).toBeInTheDocument();
      expect(lineage.getByRole("link", { name: "Widows" })).toBeInTheDocument();
      expect(lineage.getByRole("link", { name: "Dark Entities" })).toBeInTheDocument();
      // A maze is called a maze here, and the section counts it once.
      expect(screen.getByRole("region", { name: "Mazes" })).toBeInTheDocument();
    });

    it("says the returning record is incomplete rather than guessing at it", () => {
      const unplaceable = makeItem("Origins: The Curse of Calico", null);
      renderYear({
        eventYear: knottsSeason,
        houses: [unplaceable],
        lineage: {
          newThisYear: [],
          returning: [],
          unclassified: [unplaceable],
          isIncomplete: true,
        },
      });

      const lineage = within(screen.getByRole("region", { name: "New and returning" }));
      expect(
        lineage.getByText("Returning attraction archive not yet complete"),
      ).toBeInTheDocument();
      // Nothing was placed into a section on no evidence.
      expect(lineage.queryByRole("link")).not.toBeInTheDocument();
    });
  });

  it("asks nothing about new and returning at HHN, where a house belongs to its year", () => {
    renderYear({});

    expect(screen.queryByRole("region", { name: "New and returning" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Houses" })).toBeInTheDocument();
  });

  it("shows a loading state", () => {
    renderYear({ isLoading: true });
    expect(screen.getByText("Loading year…")).toBeInTheDocument();
  });

  it("shows a not-found state", () => {
    renderYear({ notFound: true, eventYear: null, stats: null });
    expect(screen.getByText("Year not found")).toBeInTheDocument();
  });

  it("shows an error state", () => {
    renderYear({ error: "Database unavailable", eventYear: null, stats: null });
    expect(screen.getByText("Database unavailable")).toBeInTheDocument();
  });
});
