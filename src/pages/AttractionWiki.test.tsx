import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Attraction } from "../models/attraction";
import type { AttractionRelation } from "../models/attractionRelation";
import type { Character } from "../models/character";
import type { EventYear } from "../models/eventYear";
import type { Media } from "../models/media";
import type { Rating } from "../models/rating";
import type { Source } from "../models/source";
import {
  useAttractionWiki,
  type AttractionWiki as AttractionWikiState,
} from "../hooks/useAttractionWiki";
import { AttractionWiki } from "./AttractionWiki";

vi.mock("../hooks/useAttractionWiki");
vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl: vi.fn() }));

const mockedUseAttractionWiki = vi.mocked(useAttractionWiki);

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
    shortSummary: "A crumbling manor wakes once a year.",
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

function makeWikiData(overrides: Partial<AttractionWikiState> = {}): AttractionWikiState {
  return {
    isLoading: false,
    error: null,
    notFound: false,
    attraction: makeAttraction(),
    eventYear: makeEventYear(),
    media: [],
    characters: [],
    sources: [],
    venueSections: [],
    appearances: [],
    rating: null,
    note: null,
    relatedItems: [],
    saveReview: vi.fn().mockResolvedValue(undefined),
    clearRating: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function renderWiki() {
  return render(
    <MemoryRouter initialEntries={["/attractions/a1"]}>
      <Routes>
        <Route path="/attractions/:attractionId" element={<AttractionWiki />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AttractionWiki", () => {
  beforeEach(() => {
    mockedUseAttractionWiki.mockReset();
  });

  describe("editing controls", () => {
    const ADMIN_KEY = "haunt-ranker:admin-mode";

    afterEach(() => {
      window.localStorage.removeItem(ADMIN_KEY);
    });

    it("offers no way to edit archive facts while Admin Mode is off", () => {
      mockedUseAttractionWiki.mockReturnValue(makeWikiData());
      renderWiki();

      expect(
        screen.queryByRole("button", { name: /Edit this attraction/ }),
      ).not.toBeInTheDocument();
    });

    it("offers an edit control once Admin Mode is on", () => {
      window.localStorage.setItem(ADMIN_KEY, "true");
      mockedUseAttractionWiki.mockReturnValue(makeWikiData());
      renderWiki();

      expect(screen.getByRole("button", { name: /Edit this attraction/ })).toBeInTheDocument();
    });
  });

  it("shows a loading state", () => {
    mockedUseAttractionWiki.mockReturnValue(makeWikiData({ isLoading: true }));
    renderWiki();
    expect(screen.getByText("Loading attraction…")).toBeInTheDocument();
  });

  it("shows a not-found state when there is no such attraction", () => {
    mockedUseAttractionWiki.mockReturnValue(makeWikiData({ notFound: true, attraction: null }));
    renderWiki();
    expect(screen.getByText("Attraction not found")).toBeInTheDocument();
  });

  it("shows an error state", () => {
    mockedUseAttractionWiki.mockReturnValue(
      makeWikiData({ error: "Database unavailable", attraction: null }),
    );
    renderWiki();
    expect(screen.getByText("Database unavailable")).toBeInTheDocument();
  });

  it("renders the header with name, year, type, IP classification and tagline", () => {
    mockedUseAttractionWiki.mockReturnValue(makeWikiData());
    renderWiki();

    expect(screen.getByRole("heading", { name: "Moonlight Manor" })).toBeInTheDocument();
    // "2101"/"House"/"Original" each appear twice — once in the header,
    // once again in the compact Details panel — so these check presence,
    // not uniqueness.
    expect(screen.getAllByText("2101").length).toBeGreaterThan(0);
    expect(screen.getAllByText("House").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Original").length).toBeGreaterThan(0);
    expect(screen.getByText("A crumbling manor wakes once a year.")).toBeInTheDocument();
  });

  it("does not render article sections that have no data", () => {
    mockedUseAttractionWiki.mockReturnValue(makeWikiData());
    renderWiki();

    expect(screen.queryByText("Overview")).not.toBeInTheDocument();
    expect(screen.queryByText("Story / Lore")).not.toBeInTheDocument();
    expect(screen.queryByText("Experience")).not.toBeInTheDocument();
    expect(screen.queryByText("Characters / Creatures")).not.toBeInTheDocument();
    expect(screen.queryByText("Development")).not.toBeInTheDocument();
    expect(screen.queryByText("Event Details")).not.toBeInTheDocument();
    expect(screen.queryByText("Related Attractions")).not.toBeInTheDocument();
    expect(screen.queryByText("Media")).not.toBeInTheDocument();
    expect(screen.queryByText("Sources")).not.toBeInTheDocument();
  });

  it("renders only the article sections that have data", () => {
    mockedUseAttractionWiki.mockReturnValue(
      makeWikiData({
        attraction: makeAttraction({
          fullOverview: "The manor's overview text.",
          storyLore: null,
          experienceDescription: "Fog machines and false floors.",
        }),
      }),
    );
    renderWiki();

    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("The manor's overview text.")).toBeInTheDocument();
    expect(screen.getByText("Experience")).toBeInTheDocument();
    expect(screen.queryByText("Story / Lore")).not.toBeInTheDocument();
  });

  it("renders characters in the Characters / Creatures section", () => {
    const characters: Character[] = [
      {
        id: "c1",
        attractionId: "a1",
        name: "The Groundskeeper",
        description: "Never seen without his lantern.",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    mockedUseAttractionWiki.mockReturnValue(makeWikiData({ characters }));
    renderWiki();

    expect(screen.getByText("Characters / Creatures")).toBeInTheDocument();
    expect(screen.getByText("The Groundskeeper")).toBeInTheDocument();
  });

  it("renders related attractions as clickable cards and in the details panel", () => {
    const relation: AttractionRelation = {
      id: "rel1",
      attractionId: "a1",
      relatedAttractionId: "a2",
      relationType: "sequel",
      notes: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    mockedUseAttractionWiki.mockReturnValue(
      makeWikiData({
        relatedItems: [
          {
            relation,
            attraction: makeAttraction({ id: "a2", name: "Moonlight Manor: Second Wake" }),
            eventYear: makeEventYear(),
            rating: null,
          },
        ],
      }),
    );
    renderWiki();

    expect(screen.getByText("Related Attractions")).toBeInTheDocument();
    expect(screen.getByText("Sequel")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /Moonlight Manor: Second Wake/ }).length,
    ).toBeGreaterThan(0);
  });

  it("shows Sources with YouTube identifiable when present", () => {
    const sources: Source[] = [
      {
        id: "s1",
        sourceType: "youtube",
        title: "Walkthrough video",
        url: "https://youtube.com/watch?v=xyz",
        publisher: null,
        publishedAt: null,
        notes: null,
        isSample: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    mockedUseAttractionWiki.mockReturnValue(makeWikiData({ sources }));
    renderWiki();

    expect(screen.getByText("Sources")).toBeInTheDocument();
    expect(screen.getByText("YouTube")).toBeInTheDocument();
  });

  it("excludes the header's hero image from the Media gallery to avoid duplication", () => {
    const media: Media[] = [
      {
        id: "m1",
        attractionId: "a1",
        eventYearId: null,
        mediaType: "poster",
        url: "https://example.com/poster.jpg",
        localPath: null,
        sourceId: null,
        attribution: null,
        licenseNotes: null,
        distribution: "reference",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    mockedUseAttractionWiki.mockReturnValue(makeWikiData({ media }));
    renderWiki();

    // The one and only media item was used as the header hero image, so
    // there's nothing left for the Media gallery section — it shouldn't render.
    expect(screen.queryByText("Media")).not.toBeInTheDocument();
  });

  it("shows the My Review panel with a not-rated message when there is no rating", () => {
    mockedUseAttractionWiki.mockReturnValue(makeWikiData({ rating: null }));
    renderWiki();

    expect(screen.getByText("My Review")).toBeInTheDocument();
    expect(screen.getByText("You haven’t rated this one yet.")).toBeInTheDocument();
  });

  it("shows read-only rating values in My Review when a rating exists", () => {
    mockedUseAttractionWiki.mockReturnValue(makeWikiData({ rating: makeRating() }));
    renderWiki();

    expect(screen.getByText("My Review")).toBeInTheDocument();
    expect(screen.getByText("12.0 / 15")).toBeInTheDocument();
  });

  it("shows the compact Details panel with Event, Year, Type and Opening/Closing when present", () => {
    mockedUseAttractionWiki.mockReturnValue(
      makeWikiData({
        attraction: makeAttraction({ openingDate: "2024-09-06", closingDate: "2024-10-31" }),
      }),
    );
    renderWiki();

    expect(screen.getByText("Details")).toBeInTheDocument();
    expect(screen.getByText("Shadowfest 2101")).toBeInTheDocument();
    expect(screen.getByText("Opening")).toBeInTheDocument();
    expect(screen.getByText("Closing")).toBeInTheDocument();
  });

  describe("what differed between venues", () => {
    const orlandoSection = {
      attractionId: "a1",
      venueId: "orlando" as const,
      overview: null,
      storyLore: null,
      experienceDescription: "The Orlando build added a final room.",
      developmentNotes: null,
      locationNotes: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    it("shows a venue's differences under the one canonical record", () => {
      mockedUseAttractionWiki.mockReturnValue(makeWikiData({ venueSections: [orlandoSection] }));
      renderWiki();

      expect(screen.getByText("At Each Venue")).toBeInTheDocument();
      expect(screen.getByText("Orlando")).toBeInTheDocument();
      expect(screen.getByText("The Orlando build added a final room.")).toBeInTheDocument();
      // A field nobody recorded gets no heading of its own.
      expect(screen.queryByText("Story / Lore")).not.toBeInTheDocument();
    });

    it("says nothing at all when there is nothing venue-specific to say", () => {
      mockedUseAttractionWiki.mockReturnValue(makeWikiData());
      renderWiki();

      expect(screen.queryByText("At Each Venue")).not.toBeInTheDocument();
    });
  });

  describe("which archive a record belongs to", () => {
    it("names the haunt on the page and in the details", () => {
      mockedUseAttractionWiki.mockReturnValue(makeWikiData());
      renderWiki();

      expect(screen.getAllByText("Halloween Horror Nights").length).toBeGreaterThan(0);
    });

    it("calls a Knott's record a maze, and states a verified debut", () => {
      mockedUseAttractionWiki.mockReturnValue(
        makeWikiData({
          attraction: makeAttraction({ name: "Widows", debutYear: 2024 }),
          eventYear: makeEventYear({
            id: "knotts-2024",
            hauntId: "knotts-scary-farm",
            calendarYear: 2024,
            name: "Knott's Scary Farm 2024",
          }),
        }),
      );
      renderWiki();

      expect(screen.getAllByText("Maze").length).toBeGreaterThan(0);
      expect(screen.getByText("Debut 2024")).toBeInTheDocument();
      expect(screen.getByText("Debuted")).toBeInTheDocument();
    });

    it("lists the seasons it is known to have run in, and only when there are several", () => {
      const knotts = makeEventYear({
        id: "knotts-2022",
        hauntId: "knotts-scary-farm",
        calendarYear: 2022,
        name: "Knott's Scary Farm 2022",
      });
      mockedUseAttractionWiki.mockReturnValue(
        makeWikiData({
          eventYear: knotts,
          appearances: [
            knotts,
            makeEventYear({ id: "knotts-2023", hauntId: "knotts-scary-farm", calendarYear: 2023 }),
            makeEventYear({ id: "knotts-2024", hauntId: "knotts-scary-farm", calendarYear: 2024 }),
          ],
        }),
      );
      renderWiki();

      expect(screen.getByText("Known appearances")).toBeInTheDocument();
      expect(screen.getByText("2022 • 2023 • 2024")).toBeInTheDocument();
    });

    it("says nothing about appearances when the archive has only seen one season", () => {
      mockedUseAttractionWiki.mockReturnValue(makeWikiData({ appearances: [makeEventYear()] }));
      renderWiki();

      // One appearance repeats what the season already says, and claiming
      // it as a record of returning years would be a fact nobody checked.
      expect(screen.queryByText("Known appearances")).not.toBeInTheDocument();
      expect(screen.queryByText("Debuted")).not.toBeInTheDocument();
    });

    it("keeps one rating panel however many venues a merged record covers", () => {
      mockedUseAttractionWiki.mockReturnValue(
        makeWikiData({
          attraction: makeAttraction({ parkIds: ["hollywood", "orlando"] }),
        }),
      );
      renderWiki();

      expect(screen.getAllByText("My Review")).toHaveLength(1);
      expect(screen.getAllByTitle(/Ran at/)).toHaveLength(2);
    });
  });
});
