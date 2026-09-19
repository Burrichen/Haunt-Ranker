import { describe, expect, it } from "vitest";
import type { Attraction } from "../models/attraction";
import type { EventYear } from "../models/eventYear";
import type { Rating } from "../models/rating";
import {
  areFiltersActive,
  compareAttractionRows,
  DEFAULT_FILTERS,
  filterAndSortRows,
  isRatingRangeActive,
  matchesFilters,
  matchesQuery,
  type AttractionBrowserFilters,
  type AttractionBrowserRow,
} from "./attractionBrowser";

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
    theme: 3,
    fun: 3,
    fear: 3,
    total: 9,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeRow(overrides: Partial<AttractionBrowserRow> = {}): AttractionBrowserRow {
  return {
    attraction: makeAttraction(),
    eventYear: makeEventYear(),
    posterUrl: null,
    rating: null,
    rankingPosition: null,
    ...overrides,
  };
}

describe("matchesQuery", () => {
  it("matches on name, case-insensitively", () => {
    const row = makeRow({ attraction: makeAttraction({ name: "Moonlight Manor" }) });
    expect(matchesQuery(row, "moonlight")).toBe(true);
    expect(matchesQuery(row, "MOONLIGHT")).toBe(true);
    expect(matchesQuery(row, "crypt")).toBe(false);
  });

  it("matches on franchise name", () => {
    const row = makeRow({
      attraction: makeAttraction({ franchiseName: "Toxic Nightmares (fictional franchise)" }),
    });
    expect(matchesQuery(row, "toxic")).toBe(true);
  });

  it("treats an empty or whitespace query as matching everything", () => {
    const row = makeRow();
    expect(matchesQuery(row, "")).toBe(true);
    expect(matchesQuery(row, "   ")).toBe(true);
  });

  it("does not throw when franchiseName is null", () => {
    const row = makeRow({ attraction: makeAttraction({ franchiseName: null }) });
    expect(matchesQuery(row, "anything")).toBe(false);
  });
});

describe("matchesFilters — years", () => {
  it("matches when the row's year is in the selected set", () => {
    const row = makeRow({ eventYear: makeEventYear({ calendarYear: 2102 }) });
    expect(matchesFilters(row, { ...DEFAULT_FILTERS, years: [2101, 2102] })).toBe(true);
    expect(matchesFilters(row, { ...DEFAULT_FILTERS, years: [2103] })).toBe(false);
  });

  it("excludes a row with no event year once a year filter is active", () => {
    const row = makeRow({ eventYear: null });
    expect(matchesFilters(row, { ...DEFAULT_FILTERS, years: [2101] })).toBe(false);
  });
});

describe("matchesFilters — parks", () => {
  it("hollywood/orlando facets match attractions present at that park, including dual-park ones", () => {
    const hollywoodOnly = makeRow({ attraction: makeAttraction({ parkIds: ["hollywood"] }) });
    const orlandoOnly = makeRow({ attraction: makeAttraction({ parkIds: ["orlando"] }) });
    const both = makeRow({ attraction: makeAttraction({ parkIds: ["hollywood", "orlando"] }) });

    const hollywoodFilter: AttractionBrowserFilters = { ...DEFAULT_FILTERS, parks: ["hollywood"] };
    expect(matchesFilters(hollywoodOnly, hollywoodFilter)).toBe(true);
    expect(matchesFilters(orlandoOnly, hollywoodFilter)).toBe(false);
    expect(matchesFilters(both, hollywoodFilter)).toBe(true);
  });

  it("the 'both' facet matches only dual-park attractions", () => {
    const hollywoodOnly = makeRow({ attraction: makeAttraction({ parkIds: ["hollywood"] }) });
    const both = makeRow({ attraction: makeAttraction({ parkIds: ["hollywood", "orlando"] }) });

    const bothFilter: AttractionBrowserFilters = { ...DEFAULT_FILTERS, parks: ["both"] };
    expect(matchesFilters(hollywoodOnly, bothFilter)).toBe(false);
    expect(matchesFilters(both, bothFilter)).toBe(true);
  });
});

describe("matchesFilters — ip type", () => {
  it("matches the selected classification and excludes unknown IP once active", () => {
    const original = makeRow({ attraction: makeAttraction({ ipType: "original" }) });
    const licensed = makeRow({ attraction: makeAttraction({ ipType: "licensed" }) });
    const unknown = makeRow({ attraction: makeAttraction({ ipType: null }) });

    const filter: AttractionBrowserFilters = { ...DEFAULT_FILTERS, ipTypes: ["original"] };
    expect(matchesFilters(original, filter)).toBe(true);
    expect(matchesFilters(licensed, filter)).toBe(false);
    expect(matchesFilters(unknown, filter)).toBe(false);
  });
});

describe("matchesFilters — rated state", () => {
  it("distinguishes rated from genuinely unrated", () => {
    const rated = makeRow({ rating: makeRating() });
    const unrated = makeRow({ rating: null });

    expect(matchesFilters(rated, { ...DEFAULT_FILTERS, rated: ["rated"] })).toBe(true);
    expect(matchesFilters(unrated, { ...DEFAULT_FILTERS, rated: ["rated"] })).toBe(false);
    expect(matchesFilters(unrated, { ...DEFAULT_FILTERS, rated: ["unrated"] })).toBe(true);
  });
});

describe("matchesFilters — rating range", () => {
  it("is inactive at the default full range, so unrated rows still show", () => {
    expect(isRatingRangeActive(DEFAULT_FILTERS)).toBe(false);
    const unrated = makeRow({ rating: null });
    expect(matchesFilters(unrated, DEFAULT_FILTERS)).toBe(true);
  });

  it("excludes unrated rows once the range is narrowed — never treated as 0", () => {
    const filters = { ...DEFAULT_FILTERS, ratingMin: 10, ratingMax: 15 };
    expect(isRatingRangeActive(filters)).toBe(true);

    const unrated = makeRow({ rating: null });
    const belowRange = makeRow({ rating: makeRating({ total: 5 }) });
    const inRange = makeRow({ rating: makeRating({ total: 12 }) });

    expect(matchesFilters(unrated, filters)).toBe(false);
    expect(matchesFilters(belowRange, filters)).toBe(false);
    expect(matchesFilters(inRange, filters)).toBe(true);
  });
});

describe("areFiltersActive", () => {
  it("is false for the defaults and true once anything is set", () => {
    expect(areFiltersActive(DEFAULT_FILTERS)).toBe(false);
    expect(areFiltersActive({ ...DEFAULT_FILTERS, query: "manor" })).toBe(true);
    expect(areFiltersActive({ ...DEFAULT_FILTERS, years: [2101] })).toBe(true);
    expect(areFiltersActive({ ...DEFAULT_FILTERS, parks: ["hollywood"] })).toBe(true);
    expect(areFiltersActive({ ...DEFAULT_FILTERS, ipTypes: ["original"] })).toBe(true);
    expect(areFiltersActive({ ...DEFAULT_FILTERS, rated: ["rated"] })).toBe(true);
    expect(areFiltersActive({ ...DEFAULT_FILTERS, ratingMax: 14 })).toBe(true);
  });
});

describe("compareAttractionRows — sorting", () => {
  it("sorts by name A-Z and Z-A", () => {
    const a = makeRow({ attraction: makeAttraction({ name: "Alpha" }) });
    const b = makeRow({ attraction: makeAttraction({ name: "Beta" }) });
    expect(compareAttractionRows(a, b, "name-asc")).toBeLessThan(0);
    expect(compareAttractionRows(a, b, "name-desc")).toBeGreaterThan(0);
  });

  it("sorts by year newest/oldest", () => {
    const older = makeRow({ eventYear: makeEventYear({ calendarYear: 2101 }) });
    const newer = makeRow({ eventYear: makeEventYear({ calendarYear: 2103 }) });
    expect(compareAttractionRows(newer, older, "year-desc")).toBeLessThan(0);
    expect(compareAttractionRows(older, newer, "year-asc")).toBeLessThan(0);
  });

  it("never treats an unrated attraction as a 0 when sorting by total, highest or lowest", () => {
    const rated = makeRow({
      attraction: makeAttraction({ name: "Rated" }),
      rating: makeRating({ total: 1 }), // deliberately low, but still a real rating
    });
    const unrated = makeRow({ attraction: makeAttraction({ name: "Unrated" }), rating: null });

    // Descending "highest first": a real (even low) rating outranks no rating at all.
    const desc = [unrated, rated].sort((x, y) => compareAttractionRows(x, y, "total-desc"));
    expect(desc.map((r) => r.attraction.name)).toEqual(["Rated", "Unrated"]);

    // Ascending "lowest first": unrated must NOT jump to the front as if it were the lowest (0).
    const asc = [unrated, rated].sort((x, y) => compareAttractionRows(x, y, "total-asc"));
    expect(asc.map((r) => r.attraction.name)).toEqual(["Rated", "Unrated"]);
  });

  it("keeps unrated entries in a stable, name-sorted block regardless of direction", () => {
    const unratedB = makeRow({ attraction: makeAttraction({ id: "b", name: "Bravo" }) });
    const unratedA = makeRow({ attraction: makeAttraction({ id: "a", name: "Alpha" }) });

    const result = [unratedB, unratedA].sort((x, y) => compareAttractionRows(x, y, "total-desc"));
    expect(result.map((r) => r.attraction.name)).toEqual(["Alpha", "Bravo"]);
  });

  it("sorts theme/fun/fear independently of total", () => {
    const a = makeRow({
      attraction: makeAttraction({ name: "A" }),
      rating: makeRating({ theme: 5, fun: 1, fear: 1, total: 7 }),
    });
    const b = makeRow({
      attraction: makeAttraction({ name: "B" }),
      rating: makeRating({ theme: 1, fun: 5, fear: 1, total: 7 }),
    });

    expect(compareAttractionRows(a, b, "theme-desc")).toBeLessThan(0);
    expect(compareAttractionRows(a, b, "fun-desc")).toBeGreaterThan(0);
  });

  it("sorts by manual ranking position ascending, unranked entries last", () => {
    const first = makeRow({ attraction: makeAttraction({ name: "First" }), rankingPosition: 0 });
    const second = makeRow({ attraction: makeAttraction({ name: "Second" }), rankingPosition: 1 });
    const unranked = makeRow({
      attraction: makeAttraction({ name: "Unranked" }),
      rankingPosition: null,
    });

    const result = [unranked, second, first].sort((x, y) => compareAttractionRows(x, y, "manual"));
    expect(result.map((r) => r.attraction.name)).toEqual(["First", "Second", "Unranked"]);
  });
});

describe("filterAndSortRows", () => {
  it("composes filtering and sorting, and never mutates the input array", () => {
    const rows = [
      makeRow({ attraction: makeAttraction({ id: "1", name: "Zebra House" }) }),
      makeRow({ attraction: makeAttraction({ id: "2", name: "Apple House" }) }),
      makeRow({
        attraction: makeAttraction({ id: "3", name: "Excluded", attractionType: "scare_zone" }),
      }),
    ];
    const original = rows.slice();

    const result = filterAndSortRows(rows, { ...DEFAULT_FILTERS, query: "house" }, "name-asc");

    expect(result.map((r) => r.attraction.name)).toEqual(["Apple House", "Zebra House"]);
    expect(rows).toEqual(original);
  });
});
