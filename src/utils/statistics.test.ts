import { describe, expect, it } from "vitest";
import type { Attraction, AttractionType, IpType } from "../models/attraction";
import type { EventYear } from "../models/eventYear";
import type { ParkId } from "../models/park";
import type { Rating } from "../models/rating";
import {
  areStatisticsFiltersActive,
  availableYears,
  computeCoverage,
  computeHighlights,
  computeScoreDistribution,
  computeTopAttractions,
  computeYearPerformance,
  coveragePercent,
  DEFAULT_STATISTICS_FILTERS,
  filterStatisticsRows,
  type StatisticsFilters,
  type StatisticsRow,
} from "./statistics";

const TIMESTAMPS = {
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

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

interface RowOptions {
  scores?: [number, number, number] | null;
  year?: number | null;
  type?: AttractionType;
  parkIds?: ParkId[];
  ipType?: IpType | null;
}

function makeRow(name: string, options: RowOptions = {}): StatisticsRow {
  const {
    scores = null,
    year = 2101,
    type = "house",
    parkIds = ["hollywood"],
    ipType = "original",
  } = options;
  const id = name.toLowerCase().replace(/\s+/g, "-");

  const attraction: Attraction = {
    id,
    eventYearId: year === null ? "orphan" : `y${year}`,
    attractionType: type,
    name,
    slug: id,
    variantName: null,
    ipType,
    franchiseName: null,
    shortSummary: null,
    fullOverview: null,
    storyLore: null,
    experienceDescription: null,
    developmentNotes: null,
    openingDate: null,
    closingDate: null,
    locationNotes: null,
    parkIds,
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

  return { attraction, rating, eventYear: year === null ? null : makeEventYear(year) };
}

function filters(overrides: Partial<StatisticsFilters>): StatisticsFilters {
  return { ...DEFAULT_STATISTICS_FILTERS, ...overrides };
}

describe("filtering", () => {
  const rows = [
    makeRow("Hollywood House", { year: 2101, type: "house", parkIds: ["hollywood"] }),
    makeRow("Orlando Zone", {
      year: 2102,
      type: "scare_zone",
      parkIds: ["orlando"],
      ipType: "licensed",
    }),
    makeRow("Dual Park", { year: 2101, parkIds: ["hollywood", "orlando"] }),
  ];

  const names = (result: StatisticsRow[]) => result.map((row) => row.attraction.name);

  it("passes everything through by default", () => {
    expect(filterStatisticsRows(rows, DEFAULT_STATISTICS_FILTERS)).toHaveLength(3);
    expect(areStatisticsFiltersActive(DEFAULT_STATISTICS_FILTERS)).toBe(false);
  });

  it("filters to one year", () => {
    expect(names(filterStatisticsRows(rows, filters({ year: 2102 })))).toEqual(["Orlando Zone"]);
  });

  it("filters by attraction type", () => {
    expect(names(filterStatisticsRows(rows, filters({ type: "scare_zone" })))).toEqual([
      "Orlando Zone",
    ]);
  });

  it("filters by park, counting an attraction that ran at both", () => {
    expect(names(filterStatisticsRows(rows, filters({ park: "orlando" })))).toEqual([
      "Orlando Zone",
      "Dual Park",
    ]);
  });

  it("filters by IP classification", () => {
    expect(names(filterStatisticsRows(rows, filters({ ipType: "licensed" })))).toEqual([
      "Orlando Zone",
    ]);
  });

  it("combines facets", () => {
    const result = filterStatisticsRows(rows, filters({ year: 2101, park: "orlando" }));
    expect(names(result)).toEqual(["Dual Park"]);
  });

  it("reports whether any facet is set", () => {
    expect(areStatisticsFiltersActive(filters({ park: "hollywood" }))).toBe(true);
    expect(areStatisticsFiltersActive(filters({ year: 2101 }))).toBe(true);
  });
});

describe("computeHighlights", () => {
  const rows = [
    makeRow("Top Overall", { scores: [4, 4, 4] }), // 12
    makeRow("Scary One", { scores: [1, 1, 5] }), // 7
    makeRow("Funny One", { scores: [1, 5, 1] }), // 7
    makeRow("Themed One", { scores: [5, 1, 1] }), // 7
    makeRow("Unrated", { scores: null }),
  ];

  it("names the best of each metric", () => {
    const highlights = computeHighlights(rows, "best");
    const byMetric = Object.fromEntries(
      highlights.map((highlight) => [highlight.metric, highlight]),
    );

    expect(highlights.map((highlight) => highlight.label)).toEqual([
      "Highest Rated",
      "Scariest",
      "Most Fun",
      "Best Theme",
    ]);
    expect(byMetric.total.attraction.name).toBe("Top Overall");
    expect(byMetric.total.value).toBe(12);
    expect(byMetric.fear.attraction.name).toBe("Scary One");
    expect(byMetric.fun.attraction.name).toBe("Funny One");
    expect(byMetric.theme.attraction.name).toBe("Themed One");
  });

  it("flips to the other end in lowest mode", () => {
    const highlights = computeHighlights(rows, "lowest");

    expect(highlights.map((highlight) => highlight.label)).toEqual([
      "Lowest Rated",
      "Least Scary",
      "Least Fun",
      "Lowest Theme",
    ]);
    // Three attractions tie on 7; the name tie-break keeps it stable.
    expect(highlights[0].attraction.name).toBe("Funny One");
  });

  it("never names an unrated attraction, even as the lowest", () => {
    const highlights = computeHighlights(rows, "lowest");
    expect(highlights.map((highlight) => highlight.attraction.name)).not.toContain("Unrated");
  });

  it("returns nothing when there is nothing reviewed", () => {
    expect(computeHighlights([makeRow("A"), makeRow("B")], "best")).toEqual([]);
  });
});

describe("computeYearPerformance", () => {
  it("averages each year and orders them oldest first", () => {
    const points = computeYearPerformance(
      [
        makeRow("A", { scores: [5, 5, 5], year: 2102 }),
        makeRow("B", { scores: [1, 1, 1], year: 2101 }),
        makeRow("C", { scores: [3, 3, 3], year: 2101 }),
      ],
      "total",
    );

    expect(points.map((point) => point.calendarYear)).toEqual([2101, 2102]);
    expect(points[0].average).toBe(6); // (3 + 9) / 2
    expect(points[0].reviewedCount).toBe(2);
    expect(points[1].average).toBe(15);
  });

  it("leaves out years with nothing reviewed instead of plotting a zero", () => {
    const points = computeYearPerformance(
      [
        makeRow("Reviewed", { scores: [3, 3, 3], year: 2101 }),
        makeRow("Unreviewed", { scores: null, year: 2102 }),
      ],
      "total",
    );

    expect(points).toHaveLength(1);
    expect(points[0].calendarYear).toBe(2101);
    expect(points.map((point) => point.calendarYear)).not.toContain(2102);
  });

  it("averages a single dimension when that metric is chosen", () => {
    const points = computeYearPerformance(
      [
        makeRow("A", { scores: [5, 0, 0], year: 2101 }),
        makeRow("B", { scores: [4, 0, 0], year: 2101 }),
      ],
      "theme",
    );

    expect(points[0].average).toBe(4.5);
  });

  it("ignores an attraction with no event year", () => {
    const points = computeYearPerformance(
      [makeRow("Orphan", { scores: [3, 3, 3], year: null })],
      "total",
    );
    expect(points).toEqual([]);
  });
});

describe("computeScoreDistribution", () => {
  it("splits 0–15 into five bands", () => {
    const buckets = computeScoreDistribution([]);
    expect(buckets.map((bucket) => bucket.label)).toEqual(["0–3", "3–6", "6–9", "9–12", "12–15"]);
  });

  it("puts each reviewed total in exactly one band, with boundaries going up", () => {
    const buckets = computeScoreDistribution([
      makeRow("Zero", { scores: [0, 0, 0] }), // 0   -> 0–3
      makeRow("Boundary", { scores: [1, 1, 1] }), // 3   -> 3–6
      makeRow("Middle", { scores: [2.5, 2.5, 2.5] }), // 7.5 -> 6–9
      makeRow("Perfect", { scores: [5, 5, 5] }), // 15  -> 12–15, the closed band
    ]);

    expect(buckets.map((bucket) => bucket.count)).toEqual([1, 1, 1, 0, 1]);
  });

  it("counts only reviewed attractions", () => {
    const buckets = computeScoreDistribution([
      makeRow("Rated", { scores: [1, 1, 1] }),
      makeRow("Unrated", { scores: null }),
    ]);

    expect(buckets.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(1);
  });
});

describe("computeCoverage", () => {
  const rows = [
    makeRow("House A", { scores: [3, 3, 3], type: "house" }),
    makeRow("House B", { scores: null, type: "house" }),
    makeRow("Zone A", { scores: [4, 4, 4], type: "scare_zone" }),
    makeRow("Zone B", { scores: null, type: "scare_zone" }),
    makeRow("Zone C", { scores: null, type: "scare_zone" }),
  ];

  it("reports reviewed out of total, broken down by type", () => {
    const coverage = computeCoverage(rows);

    expect(coverage.all).toEqual({ reviewed: 2, total: 5 });
    expect(coverage.houses).toEqual({ reviewed: 1, total: 2 });
    expect(coverage.scareZones).toEqual({ reviewed: 1, total: 3 });
  });

  it("turns a slice into a percentage, with nothing in scope reading as zero", () => {
    expect(coveragePercent({ reviewed: 1, total: 4 })).toBe(25);
    expect(coveragePercent({ reviewed: 0, total: 0 })).toBe(0);
  });
});

describe("computeTopAttractions", () => {
  const rows = [
    makeRow("Middle", { scores: [3, 3, 3] }),
    makeRow("Best", { scores: [5, 5, 5] }),
    makeRow("Unrated", { scores: null }),
    makeRow("Worst", { scores: [1, 1, 1] }),
  ];

  it("ranks reviewed attractions by the chosen metric", () => {
    const top = computeTopAttractions(rows, "total");
    expect(top.map((item) => item.attraction.name)).toEqual(["Best", "Middle", "Worst"]);
    expect(top[0].value).toBe(15);
  });

  it("ranks by a single dimension when asked", () => {
    const top = computeTopAttractions(
      [makeRow("Scary", { scores: [1, 1, 5] }), makeRow("Themed", { scores: [5, 1, 1] })],
      "fear",
    );
    expect(top[0].attraction.name).toBe("Scary");
  });

  it("caps the list at the requested limit", () => {
    const many = Array.from({ length: 15 }, (_, index) =>
      makeRow(`Attraction ${index}`, { scores: [1, 1, 1] }),
    );
    expect(computeTopAttractions(many, "total")).toHaveLength(10);
    expect(computeTopAttractions(many, "total", 3)).toHaveLength(3);
  });

  it("carries the event year through for the hover preview", () => {
    const top = computeTopAttractions(
      [makeRow("Best", { scores: [5, 5, 5], year: 2103 })],
      "total",
    );
    expect(top[0].eventYear?.calendarYear).toBe(2103);
  });

  it("breaks ties by name", () => {
    const top = computeTopAttractions(
      [makeRow("Zed", { scores: [3, 3, 3] }), makeRow("Alpha", { scores: [3, 3, 3] })],
      "total",
    );
    expect(top.map((item) => item.attraction.name)).toEqual(["Alpha", "Zed"]);
  });
});

describe("availableYears", () => {
  it("lists every year present, newest first, without duplicates", () => {
    const years = availableYears([
      makeRow("A", { year: 2101 }),
      makeRow("B", { year: 2103 }),
      makeRow("C", { year: 2101 }),
      makeRow("D", { year: null }),
    ]);

    expect(years).toEqual([2103, 2101]);
  });
});
