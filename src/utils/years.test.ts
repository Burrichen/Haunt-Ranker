import { describe, expect, it } from "vitest";
import type { Attraction, AttractionType } from "../models/attraction";
import type { EventYear } from "../models/eventYear";
import type { Rating } from "../models/rating";
import {
  buildYearRanking,
  computeYearStats,
  MIN_REVIEWED_FOR_STATS,
  summarizeYear,
  type YearAttraction,
  type YearSummary,
} from "./years";

const TIMESTAMPS = {
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function makeEventYear(calendarYear: number): EventYear {
  return {
    id: `y${calendarYear}`,
    calendarYear,
    hauntId: "hhn",
    name: `Shadowfest ${calendarYear}`,
    description: null,
    sourceNotes: null,
    startsOn: null,
    endsOn: null,
    isSample: true,
    ...TIMESTAMPS,
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

describe("computeYearStats", () => {
  it("averages only the reviewed attractions — an unrated one is not a zero dragging the mean down", () => {
    const stats = computeYearStats([
      makeItem("Rated High", [5, 4, 3]), // 12
      makeItem("Rated Low", [3, 4, 3]), // 10
      makeItem("Never Rated", null),
    ]);

    expect(stats.reviewedCount).toBe(2);
    expect(stats.attractionCount).toBe(3);
    // (12 + 10) / 2, not (12 + 10 + 0) / 3.
    expect(stats.averages?.total).toBe(11);
    expect(stats.averages?.theme).toBe(4);
    expect(stats.averages?.fun).toBe(4);
    expect(stats.averages?.fear).toBe(3);
  });

  it("refuses to state anything from a single review", () => {
    const stats = computeYearStats([makeItem("Only One", [5, 5, 5]), makeItem("Unrated", null)]);

    expect(stats.reviewedCount).toBe(1);
    expect(stats.averages).toBeNull();
    expect(stats.superlatives).toBeNull();
  });

  it("says nothing at all for a year with no reviews", () => {
    const stats = computeYearStats([makeItem("A", null), makeItem("B", null)]);

    expect(stats.reviewedCount).toBe(0);
    expect(stats.averages).toBeNull();
    expect(stats.superlatives).toBeNull();
  });

  it("starts reporting exactly at the minimum sample size", () => {
    const items = Array.from({ length: MIN_REVIEWED_FOR_STATS }, (_, index) =>
      makeItem(`Rated ${index}`, [2, 2, 2]),
    );

    const stats = computeYearStats(items);
    expect(stats.averages).not.toBeNull();
    expect(stats.superlatives).not.toBeNull();
  });

  it("picks the right attraction for each superlative", () => {
    // Scored so every superlative has one unambiguous winner — ties are
    // covered by their own test below.
    const stats = computeYearStats([
      makeItem("Themed", [5, 2, 3]), // total 10
      makeItem("Funny", [3, 5, 2]), // total 10
      makeItem("Scary", [2, 3, 5]), // total 10
      makeItem("Best Overall", [4, 4, 4]), // total 12
      makeItem("Worst Overall", [0.5, 0.5, 0.5]), // total 1.5
    ]);

    const superlatives = stats.superlatives;
    expect(superlatives?.highestRated.attraction.name).toBe("Best Overall");
    expect(superlatives?.highestRated.value).toBe(12);
    expect(superlatives?.lowestRated.attraction.name).toBe("Worst Overall");
    expect(superlatives?.lowestRated.value).toBe(1.5);
    expect(superlatives?.bestTheme.attraction.name).toBe("Themed");
    expect(superlatives?.bestTheme.value).toBe(5);
    expect(superlatives?.lowestTheme.attraction.name).toBe("Worst Overall");
    expect(superlatives?.mostFun.attraction.name).toBe("Funny");
    expect(superlatives?.leastFun.attraction.name).toBe("Worst Overall");
    expect(superlatives?.scariest.attraction.name).toBe("Scary");
    expect(superlatives?.leastScary.attraction.name).toBe("Worst Overall");
  });

  it("breaks superlative ties by name so the same attraction is named every time", () => {
    const stats = computeYearStats([
      makeItem("Zed House", [5, 5, 5]),
      makeItem("Alpha House", [5, 5, 5]),
    ]);

    expect(stats.superlatives?.highestRated.attraction.name).toBe("Alpha House");
    expect(stats.superlatives?.lowestRated.attraction.name).toBe("Alpha House");
  });

  it("ignores unrated attractions when picking superlatives", () => {
    const stats = computeYearStats([
      makeItem("Rated A", [4, 4, 4]),
      makeItem("Rated B", [2, 2, 2]),
      makeItem("Aardvark Unrated", null),
    ]);

    expect(stats.superlatives?.lowestRated.attraction.name).toBe("Rated B");
  });
});

describe("summarizeYear", () => {
  it("counts houses, scare zones and reviews, and carries the artwork through", () => {
    const summary = summarizeYear(
      makeEventYear(2101),
      [
        makeItem("House One", [3, 3, 3], "house"),
        makeItem("House Two", null, "house"),
        makeItem("Zone One", [4, 4, 4], "scare_zone"),
      ],
      "https://example.invalid/art.jpg",
    );

    expect(summary.houseCount).toBe(2);
    expect(summary.scareZoneCount).toBe(1);
    expect(summary.reviewedCount).toBe(2);
    expect(summary.attractionCount).toBe(3);
    expect(summary.artworkUrl).toBe("https://example.invalid/art.jpg");
    expect(summary.averages?.total).toBe(10.5);
  });

  it("leaves the average unset when the year is barely reviewed", () => {
    const summary = summarizeYear(
      makeEventYear(2102),
      [makeItem("Only One", [5, 5, 5]), makeItem("Unrated", null)],
      null,
    );

    expect(summary.reviewedCount).toBe(1);
    expect(summary.averages).toBeNull();
  });
});

describe("buildYearRanking", () => {
  function summaryFor(calendarYear: number, items: YearAttraction[]): YearSummary {
    return summarizeYear(makeEventYear(calendarYear), items, null);
  }

  const strong = summaryFor(2101, [makeItem("A", [5, 5, 5]), makeItem("B", [5, 5, 5])]); // 15
  const middling = summaryFor(2102, [makeItem("C", [3, 3, 3]), makeItem("D", [3, 3, 3])]); // 9
  const thin = summaryFor(2103, [makeItem("E", [5, 5, 5]), makeItem("F", null)]); // 1 review

  it("orders rankable years by average total, highest first", () => {
    const { ranked } = buildYearRanking([middling, strong]);
    expect(ranked.map((summary) => summary.eventYear.calendarYear)).toEqual([2101, 2102]);
  });

  it("can order lowest first", () => {
    const { ranked } = buildYearRanking([strong, middling], {
      metric: "total",
      direction: "asc",
    });
    expect(ranked.map((summary) => summary.eventYear.calendarYear)).toEqual([2102, 2101]);
  });

  it("orders by a single dimension when asked", () => {
    const themed = summaryFor(2104, [makeItem("G", [5, 1, 1]), makeItem("H", [5, 1, 1])]);
    const scary = summaryFor(2105, [makeItem("I", [1, 1, 5]), makeItem("J", [1, 1, 5])]);

    const byTheme = buildYearRanking([scary, themed], { metric: "theme", direction: "desc" });
    expect(byTheme.ranked[0].eventYear.calendarYear).toBe(2104);

    const byFear = buildYearRanking([themed, scary], { metric: "fear", direction: "desc" });
    expect(byFear.ranked[0].eventYear.calendarYear).toBe(2105);
  });

  it("holds back a year with too few reviews instead of ranking it top", () => {
    // `thin` averages a perfect 15 off one review — it would otherwise beat
    // every fully reviewed year.
    const { ranked, insufficient } = buildYearRanking([strong, middling, thin]);

    expect(ranked.map((summary) => summary.eventYear.calendarYear)).toEqual([2101, 2102]);
    expect(insufficient.map((summary) => summary.eventYear.calendarYear)).toEqual([2103]);
  });

  it("breaks ties by the most recent year", () => {
    const older = summaryFor(2100, [makeItem("K", [3, 3, 3]), makeItem("L", [3, 3, 3])]);
    const { ranked } = buildYearRanking([older, middling]);

    expect(ranked.map((summary) => summary.eventYear.calendarYear)).toEqual([2102, 2100]);
  });

  it("lists the held-back years newest first", () => {
    const olderThin = summaryFor(2099, [makeItem("M", [4, 4, 4])]);
    const { insufficient } = buildYearRanking([olderThin, thin]);

    expect(insufficient.map((summary) => summary.eventYear.calendarYear)).toEqual([2103, 2099]);
  });
});
