import { describe, expect, it } from "vitest";
import type { Attraction } from "../models/attraction";
import type { EventYear } from "../models/eventYear";
import type { Rating } from "../models/rating";
import {
  applyVisibleOrder,
  areRankingFiltersActive,
  buildCalculatedRanking,
  buildManualRanking,
  DEFAULT_RANKING_FILTERS,
  groupAttractionTypes,
  matchesRankingFilters,
  moveItem,
  rankingSortLabel,
  type RankingFilters,
  type RankingRow,
} from "./rankings";

const TIMESTAMPS = {
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function makeAttraction(name: string, overrides: Partial<Attraction> = {}): Attraction {
  return {
    id: name.toLowerCase().replace(/\s+/g, "-"),
    eventYearId: "y1",
    attractionType: "house",
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
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
    ...TIMESTAMPS,
    ...overrides,
  };
}

function makeEventYear(calendarYear: number): EventYear {
  return {
    id: `y${calendarYear}`,
    calendarYear,
    name: `Shadowfest ${calendarYear}`,
    description: null,
    sourceNotes: null,
    startsOn: null,
    endsOn: null,
    isSample: true,
    ...TIMESTAMPS,
  };
}

function makeRating(theme: number, fun: number, fear: number): Rating {
  return {
    id: "r",
    attractionId: "a",
    theme,
    fun,
    fear,
    total: theme + fun + fear,
    ...TIMESTAMPS,
  };
}

/** `scores` of null means genuinely unrated. */
function makeRow(
  name: string,
  scores: [number, number, number] | null,
  overrides: Partial<Attraction> = {},
  calendarYear = 2101,
): RankingRow {
  return {
    attraction: makeAttraction(name, overrides),
    eventYear: makeEventYear(calendarYear),
    rating: scores ? makeRating(...scores) : null,
  };
}

const names = (rows: RankingRow[]) => rows.map((row) => row.attraction.name);

describe("buildCalculatedRanking", () => {
  it("orders by total, highest first", () => {
    const { ranked } = buildCalculatedRanking([
      makeRow("Middle", [3, 3, 3]),
      makeRow("Best", [5, 5, 4]),
      makeRow("Worst", [1, 1, 1]),
    ]);

    expect(names(ranked)).toEqual(["Best", "Middle", "Worst"]);
  });

  it("breaks ties by name so the order is stable rather than load-order dependent", () => {
    const { ranked } = buildCalculatedRanking([
      makeRow("Zombie Mall", [3, 3, 3]),
      makeRow("Asylum", [3, 3, 3]),
      makeRow("Manor", [3, 3, 3]),
    ]);

    expect(names(ranked)).toEqual(["Asylum", "Manor", "Zombie Mall"]);
  });

  it("keeps unrated attractions out of the ranking entirely", () => {
    const { ranked, unrated } = buildCalculatedRanking([
      makeRow("Rated", [2, 2, 2]),
      makeRow("Unrated", null),
    ]);

    expect(names(ranked)).toEqual(["Rated"]);
    expect(names(unrated)).toEqual(["Unrated"]);
  });

  it("never treats unrated as a zero — a real 0/0/0 rating ranks, an unrated one doesn't", () => {
    const { ranked, unrated } = buildCalculatedRanking([
      makeRow("Deliberate Zero", [0, 0, 0]),
      makeRow("Never Rated", null),
      makeRow("Decent", [2, 2, 2]),
    ]);

    // The zero-scored attraction is genuinely last in the ranking; the
    // unrated one isn't in it at all.
    expect(names(ranked)).toEqual(["Decent", "Deliberate Zero"]);
    expect(names(unrated)).toEqual(["Never Rated"]);
  });

  it("can order lowest first", () => {
    const { ranked } = buildCalculatedRanking(
      [makeRow("High", [5, 5, 5]), makeRow("Low", [1, 1, 1])],
      { metric: "total", direction: "asc" },
    );

    expect(names(ranked)).toEqual(["Low", "High"]);
  });

  it.each([
    ["theme", ["Themed", "Funny", "Scary"]],
    ["fun", ["Funny", "Scary", "Themed"]],
    ["fear", ["Scary", "Themed", "Funny"]],
  ] as const)("orders by %s when that metric is chosen", (metric, expected) => {
    const rows = [
      makeRow("Themed", [5, 1, 3]),
      makeRow("Funny", [3, 5, 1]),
      makeRow("Scary", [1, 3, 5]),
    ];

    const { ranked } = buildCalculatedRanking(rows, { metric, direction: "desc" });
    expect(names(ranked)).toEqual(expected);
  });

  it("lists unrated attractions alphabetically", () => {
    const { unrated } = buildCalculatedRanking([makeRow("Zed", null), makeRow("Alpha", null)]);

    expect(names(unrated)).toEqual(["Alpha", "Zed"]);
  });
});

describe("buildManualRanking", () => {
  const best = makeRow("Best", [5, 5, 5]);
  const middle = makeRow("Middle", [3, 3, 3]);
  const worst = makeRow("Worst", [1, 1, 1]);

  it("uses the saved order, not the scores", () => {
    const { ranked } = buildManualRanking([best, middle, worst], ["worst", "best", "middle"]);

    expect(names(ranked)).toEqual(["Worst", "Best", "Middle"]);
  });

  it("does not move a row when its score changes — the saved order is authoritative", () => {
    const order = ["worst", "best", "middle"];
    const before = buildManualRanking([best, middle, worst], order);

    // The same attraction, re-rated from 3/3/3 up to a perfect score.
    const rescored = { ...middle, rating: makeRating(5, 5, 5) };
    const after = buildManualRanking([best, rescored, worst], order);

    expect(names(after.ranked)).toEqual(names(before.ranked));
  });

  it("keeps a placed attraction that has since lost its rating", () => {
    const cleared = { ...middle, rating: null };
    const { ranked, unrated } = buildManualRanking(
      [best, cleared, worst],
      ["best", "middle", "worst"],
    );

    expect(names(ranked)).toEqual(["Best", "Middle", "Worst"]);
    expect(unrated).toEqual([]);
  });

  it("skips saved ids that no longer resolve to a row", () => {
    const { ranked } = buildManualRanking([best, worst], ["best", "deleted-id", "worst"]);
    expect(names(ranked)).toEqual(["Best", "Worst"]);
  });

  it("surfaces newly-rated attractions separately instead of appending them to the ranking", () => {
    const newcomer = makeRow("Newcomer", [4, 4, 4]);
    const { ranked, unplaced } = buildManualRanking([best, middle, newcomer], ["middle", "best"]);

    expect(names(ranked)).toEqual(["Middle", "Best"]);
    expect(names(unplaced)).toEqual(["Newcomer"]);
  });

  it("splits everything unplaced into rated and unrated buckets", () => {
    const newcomer = makeRow("Newcomer", [4, 4, 4]);
    const blank = makeRow("Blank", null);
    const { ranked, unplaced, unrated } = buildManualRanking([best, newcomer, blank], ["best"]);

    expect(names(ranked)).toEqual(["Best"]);
    expect(names(unplaced)).toEqual(["Newcomer"]);
    expect(names(unrated)).toEqual(["Blank"]);
  });
});

describe("applyVisibleOrder", () => {
  it("reorders the visible ids without disturbing hidden ones", () => {
    // b and d are hidden by a filter; only a, c and e are on screen.
    const full = ["a", "b", "c", "d", "e"];
    const next = applyVisibleOrder(full, ["e", "a", "c"]);

    // The visible entries fill the slots they already occupied (0, 2, 4),
    // so b and d stay exactly where they were.
    expect(next).toEqual(["e", "b", "a", "d", "c"]);
  });

  it("is a plain reorder when everything is visible", () => {
    expect(applyVisibleOrder(["a", "b", "c"], ["c", "b", "a"])).toEqual(["c", "b", "a"]);
  });

  it("never drops hidden ids — the saved ranking survives reordering under a filter", () => {
    const full = ["a", "b", "c", "d"];
    const next = applyVisibleOrder(full, ["d", "b"]);

    expect(next).toHaveLength(full.length);
    expect([...next].sort()).toEqual([...full].sort());
  });

  it("appends ids that weren't in the saved order at all", () => {
    expect(applyVisibleOrder(["a", "b"], ["b", "a", "new"])).toEqual(["b", "a", "new"]);
  });
});

describe("moveItem", () => {
  it("moves an item down", () => {
    expect(moveItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
  });

  it("moves an item up", () => {
    expect(moveItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
  });

  it("returns the original array untouched for a no-op or out-of-range move", () => {
    const items = ["a", "b", "c"];
    expect(moveItem(items, 1, 1)).toBe(items);
    expect(moveItem(items, 0, -1)).toBe(items);
    expect(moveItem(items, 0, 3)).toBe(items);
  });
});

describe("matchesRankingFilters", () => {
  const row = makeRow("Manor", [3, 3, 3], { parkIds: ["hollywood"], ipType: "original" }, 2101);

  function filters(overrides: Partial<RankingFilters>): RankingFilters {
    return { ...DEFAULT_RANKING_FILTERS, ...overrides };
  }

  it("matches everything when nothing is filtered", () => {
    expect(matchesRankingFilters(row, DEFAULT_RANKING_FILTERS)).toBe(true);
  });

  it("filters by year", () => {
    expect(matchesRankingFilters(row, filters({ years: [2101] }))).toBe(true);
    expect(matchesRankingFilters(row, filters({ years: [2102] }))).toBe(false);
  });

  it("filters by attraction type", () => {
    expect(matchesRankingFilters(row, filters({ types: ["house"] }))).toBe(true);
    expect(matchesRankingFilters(row, filters({ types: ["scare_zone"] }))).toBe(false);
  });

  it("filters by park, where 'both' means it ran at two parks", () => {
    const dual = makeRow("Dual", [3, 3, 3], { parkIds: ["hollywood", "orlando"] });

    expect(matchesRankingFilters(row, filters({ parks: ["hollywood"] }))).toBe(true);
    expect(matchesRankingFilters(row, filters({ parks: ["orlando"] }))).toBe(false);
    expect(matchesRankingFilters(row, filters({ parks: ["both"] }))).toBe(false);
    expect(matchesRankingFilters(dual, filters({ parks: ["both"] }))).toBe(true);
  });

  it("filters by IP classification", () => {
    expect(matchesRankingFilters(row, filters({ ipTypes: ["original"] }))).toBe(true);
    expect(matchesRankingFilters(row, filters({ ipTypes: ["licensed"] }))).toBe(false);
  });

  it("excludes an attraction with no IP classification when that filter is on", () => {
    const unknown = makeRow("Unknown", [3, 3, 3], { ipType: null });
    expect(matchesRankingFilters(unknown, filters({ ipTypes: ["original"] }))).toBe(false);
  });
});

describe("areRankingFiltersActive", () => {
  it("is false for the defaults and true for any set filter", () => {
    expect(areRankingFiltersActive(DEFAULT_RANKING_FILTERS)).toBe(false);
    expect(areRankingFiltersActive({ ...DEFAULT_RANKING_FILTERS, years: [2101] })).toBe(true);
    expect(areRankingFiltersActive({ ...DEFAULT_RANKING_FILTERS, parks: ["both"] })).toBe(true);
  });
});

describe("groupAttractionTypes", () => {
  it("maps each group to the types it contains", () => {
    expect(groupAttractionTypes("houses")).toEqual(["house"]);
    expect(groupAttractionTypes("scare_zones")).toEqual(["scare_zone"]);
    expect(groupAttractionTypes("all")).toEqual(["house", "scare_zone"]);
  });
});

describe("rankingSortLabel", () => {
  it("reads as a direction, not a code", () => {
    expect(rankingSortLabel({ metric: "total", direction: "desc" })).toBe("Total high → low");
    expect(rankingSortLabel({ metric: "fear", direction: "asc" })).toBe("Fear low → high");
  });
});
