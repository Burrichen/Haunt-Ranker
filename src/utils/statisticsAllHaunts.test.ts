import { describe, expect, it } from "vitest";
import type { Attraction } from "../models/attraction";
import type { EventYear } from "../models/eventYear";
import type { ParkId } from "../models/park";
import type { Rating } from "../models/rating";
import {
  computeCoverage,
  computeDebutsByYear,
  computeHighlights,
  computeTopAttractions,
  computeYearPerformance,
  filterStatisticsRows,
  DEFAULT_STATISTICS_FILTERS,
  type StatisticsRow,
} from "./statistics";
import { runYearQuery } from "./statisticsExplorer";

/**
 * Statistics across both haunts: Knott's mazes compete on equal terms with
 * HHN houses, seasons of the two never merge, a two-park house counts once,
 * and Knott's partial line-ups are never presented as complete.
 */
const STAMP = { createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
const HHN = "hhn";
const KNOTTS = "knotts-scary-farm";
const PARTIAL = new Set([KNOTTS]);

function season(hauntId: string, year: number): EventYear {
  return {
    id: `${hauntId}:${year}`,
    calendarYear: year,
    hauntId,
    name: `${hauntId === HHN ? "Halloween Horror Nights" : "Knott's Scary Farm"} ${year}`,
    description: null,
    sourceNotes: null,
    startsOn: null,
    endsOn: null,
    isSample: false,
    ...STAMP,
  };
}

function row(
  name: string,
  home: EventYear,
  scores: [number, number, number] | null,
  options: { parks?: ParkId[]; ranIn?: EventYear[]; debut?: number } = {},
): StatisticsRow {
  const id = name.toLowerCase().replace(/\W+/g, "-");
  const attraction: Attraction = {
    id,
    eventYearId: home.id,
    attractionType: "house",
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
    debutYear: options.debut ?? null,
    experienceTypeId: null,
    parkIds: options.parks ?? (home.hauntId === HHN ? ["orlando"] : ["knotts-berry-farm"]),
    isSample: false,
    ...STAMP,
  };
  const rating: Rating | null = scores
    ? {
        id: `r-${id}`,
        attractionId: id,
        theme: scores[0],
        fun: scores[1],
        fear: scores[2],
        total: scores[0] + scores[1] + scores[2],
        ...STAMP,
      }
    : null;
  return { attraction, eventYear: home, rating, appearances: options.ranIn ?? [home] };
}

const hhn2024 = season(HHN, 2024);
const ksf2023 = season(KNOTTS, 2023);
const ksf2024 = season(KNOTTS, 2024);
const ksf2025 = season(KNOTTS, 2025);

const ROWS = [
  row("Quarry", hhn2024, [3, 3, 3], { parks: ["hollywood", "orlando"] }),
  row("Hollywood Only", hhn2024, [2, 2, 2], { parks: ["hollywood"] }),
  // The best and the worst of everything are Knott's mazes here.
  row("Room 13", ksf2023, [5, 5, 5], { ranIn: [ksf2023, ksf2024, ksf2025], debut: 2023 }),
  row("Widows", ksf2024, [1, 1, 1], { ranIn: [ksf2024, ksf2025], debut: 2024 }),
  row("Unearthed", ksf2025, null, { debut: 2025 }),
];

describe("All Haunts statistics", () => {
  it("lets a Knott's maze be every best — and every worst — highlight", () => {
    const best = computeHighlights(ROWS, "best");
    expect(best.map((h) => [h.label, h.attraction.name, h.eventYear?.hauntId])).toEqual([
      ["Highest Rated", "Room 13", KNOTTS],
      ["Scariest", "Room 13", KNOTTS],
      ["Most Fun", "Room 13", KNOTTS],
      ["Best Theme", "Room 13", KNOTTS],
    ]);
    expect(computeHighlights(ROWS, "lowest").every((h) => h.attraction.name === "Widows")).toBe(
      true,
    );
  });

  it("ranks Top and Bottom purely by score, Knott's mazes included", () => {
    expect(computeTopAttractions(ROWS, "total").map((t) => t.attraction.name)).toEqual([
      "Room 13",
      "Quarry",
      "Hollywood Only",
      "Widows",
    ]);
    expect(computeTopAttractions(ROWS, "total", 10, "asc").map((t) => t.attraction.name)).toEqual([
      "Widows",
      "Hollywood Only",
      "Quarry",
      "Room 13",
    ]);
  });

  it("averages each haunt's seasons separately, by verified appearance", () => {
    const points = computeYearPerformance(ROWS, "total", { partialHaunts: PARTIAL });
    expect(points.map((p) => [p.label, p.average, p.reviewedCount])).toEqual([
      ["Knott's Scary Farm 2023", 15, 1],
      ["Halloween Horror Nights 2024", 7.5, 2],
      // Room 13 and Widows both ran in 2024 and 2025: one maze, one rating,
      // counted in every line-up it was part of.
      ["Knott's Scary Farm 2024", 9, 2],
      ["Knott's Scary Farm 2025", 9, 2],
    ]);
  });

  it("switching the metric moves both haunts' lines", () => {
    const fun = computeYearPerformance(ROWS, "fun", { partialHaunts: PARTIAL });
    expect(fun.map((p) => p.average)).toEqual([5, 2.5, 3, 3]);
  });

  it("flags Knott's line-ups as partial, and never HHN's", () => {
    const points = computeYearPerformance(ROWS, "total", { partialHaunts: PARTIAL });
    expect(points.filter((p) => p.partial).map((p) => p.hauntId)).toEqual([KNOTTS, KNOTTS, KNOTTS]);
    expect(points.find((p) => p.hauntId === HHN)?.partial).toBe(false);
  });

  it("never merges HHN 2024 and Knott's 2024 when ranking seasons", () => {
    const ranked = runYearQuery(ROWS, DEFAULT_STATISTICS_FILTERS, "total", "desc");
    expect(
      ranked
        .filter((r) => r.calendarYear === 2024)
        .map((r) => r.label)
        .sort(),
    ).toEqual(["Halloween Horror Nights 2024", "Knott's Scary Farm 2024"]);
  });

  it("filters a season by who ran in it, not who debuted in it", () => {
    const in2025 = filterStatisticsRows(ROWS, { ...DEFAULT_STATISTICS_FILTERS, year: 2025 });
    expect(in2025.map((r) => r.attraction.name).sort()).toEqual(["Room 13", "Unearthed", "Widows"]);
  });

  it("counts new debuts per year, never line-ups", () => {
    expect(computeDebutsByYear(ROWS, KNOTTS)).toEqual([
      { year: 2023, count: 1 },
      { year: 2024, count: 1 },
      { year: 2025, count: 1 },
    ]);
    expect(computeDebutsByYear(ROWS, HHN)).toEqual([]);
  });

  it("shows each haunt's coverage apart, and combined", () => {
    const coverage = computeCoverage(ROWS, [HHN, KNOTTS]);
    expect(coverage.byHaunt).toEqual([
      { hauntId: HHN, reviewed: 2, total: 2 },
      { hauntId: KNOTTS, reviewed: 2, total: 3 },
    ]);
    expect(coverage.all).toEqual({ reviewed: 4, total: 5 });
  });
});

describe("HHN venues", () => {
  const hhn = ROWS.filter((r) => r.eventYear?.hauntId === HHN);
  const names = (park: ParkId | null) =>
    filterStatisticsRows(hhn, { ...DEFAULT_STATISTICS_FILTERS, park }).map(
      (r) => r.attraction.name,
    );

  it("counts a house that ran at both parks once — under either venue, and under both", () => {
    expect(names("hollywood")).toEqual(["Quarry", "Hollywood Only"]);
    expect(names("orlando")).toEqual(["Quarry"]);
    expect(names(null)).toEqual(["Quarry", "Hollywood Only"]);
    expect(computeTopAttractions(hhn, "total").map((t) => t.attraction.name)).toEqual([
      "Quarry",
      "Hollywood Only",
    ]);
  });
});
