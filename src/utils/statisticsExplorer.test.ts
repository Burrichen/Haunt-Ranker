import { describe, expect, it } from "vitest";
import type { Attraction, AttractionType, IpType } from "../models/attraction";
import type { EventYear } from "../models/eventYear";
import type { ParkId } from "../models/park";
import type { Rating } from "../models/rating";
import {
  DEFAULT_STATISTICS_FILTERS,
  type StatisticsFilters,
  type StatisticsRow,
} from "./statistics";
import { runAttractionQuery, runYearQuery, type ExplorerQuery } from "./statisticsExplorer";

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

interface RowOptions {
  scores?: [number, number, number] | null;
  year?: number;
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
    eventYearId: `y${year}`,
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
    debutYear: null,
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

  return { attraction, rating, eventYear: makeEventYear(year) };
}

function query(overrides: Partial<ExplorerQuery> = {}): ExplorerQuery {
  return {
    filters: DEFAULT_STATISTICS_FILTERS,
    metric: "total",
    direction: "desc",
    reviewedOnly: true,
    ...overrides,
  };
}

function filters(overrides: Partial<StatisticsFilters>): StatisticsFilters {
  return { ...DEFAULT_STATISTICS_FILTERS, ...overrides };
}

/**
 * A small archive spanning both parks, both types, both IP classifications
 * and three years — enough for every combination the explorer is meant to
 * answer.
 */
const ARCHIVE: StatisticsRow[] = [
  makeRow("Terror House", {
    scores: [3, 2, 5], // total 10
    year: 2101,
    type: "house",
    parkIds: ["hollywood"],
    ipType: "original",
  }),
  makeRow("Gentle House", {
    scores: [4, 5, 1], // total 10
    year: 2101,
    type: "house",
    parkIds: ["orlando"],
    ipType: "licensed",
  }),
  makeRow("Carnival Zone", {
    scores: [5, 4.5, 2], // total 11.5
    year: 2102,
    type: "scare_zone",
    parkIds: ["orlando"],
    ipType: "original",
  }),
  makeRow("Fog Zone", {
    scores: [1, 1, 4], // total 6
    year: 2102,
    type: "scare_zone",
    parkIds: ["hollywood", "orlando"],
    ipType: "licensed",
  }),
  makeRow("Unrated House", {
    scores: null,
    year: 2103,
    type: "house",
    parkIds: ["hollywood"],
    ipType: "original",
  }),
];

const names = (rows: Array<{ attraction: Attraction }>) => rows.map((row) => row.attraction.name);

describe("runAttractionQuery", () => {
  it("ranks by total, highest first, numbering from 1", () => {
    const { ranked } = runAttractionQuery(ARCHIVE, query());

    expect(names(ranked)).toEqual(["Carnival Zone", "Gentle House", "Terror House", "Fog Zone"]);
    expect(ranked.map((row) => row.rank)).toEqual([1, 2, 3, 4]);
  });

  it("breaks ties by name so the answer doesn't reshuffle between renders", () => {
    // Gentle House and Terror House both total 10.
    const { ranked } = runAttractionQuery(ARCHIVE, query());
    expect(names(ranked).slice(1, 3)).toEqual(["Gentle House", "Terror House"]);
  });

  it("carries the value of the metric being ranked by, and the whole rating with it", () => {
    const { ranked } = runAttractionQuery(ARCHIVE, query({ metric: "fear" }));

    expect(ranked[0].attraction.name).toBe("Terror House");
    expect(ranked[0].value).toBe(5);
    // The total travels along, so the table can show it beside the metric.
    expect(ranked[0].rating.total).toBe(10);
  });

  it("never ranks an unrated attraction, and only lists one when asked", () => {
    const hidden = runAttractionQuery(ARCHIVE, query({ reviewedOnly: true }));
    expect(names(hidden.ranked)).not.toContain("Unrated House");
    expect(hidden.unrated).toEqual([]);

    const shown = runAttractionQuery(ARCHIVE, query({ reviewedOnly: false }));
    expect(names(shown.ranked)).not.toContain("Unrated House");
    expect(names(shown.unrated)).toEqual(["Unrated House"]);
  });

  it("reports how many attractions the filters matched, reviewed or not", () => {
    const result = runAttractionQuery(ARCHIVE, query({ reviewedOnly: true }));
    expect(result.matchCount).toBe(5);
    expect(result.ranked).toHaveLength(4);
  });

  describe("the questions the interface is meant to answer, from the generic query alone", () => {
    it("scariest attractions ever", () => {
      const { ranked } = runAttractionQuery(ARCHIVE, query({ metric: "fear" }));
      expect(names(ranked)).toEqual(["Terror House", "Fog Zone", "Carnival Zone", "Gentle House"]);
    });

    it("least scary Houses", () => {
      const { ranked } = runAttractionQuery(
        ARCHIVE,
        query({ metric: "fear", direction: "asc", filters: filters({ type: "house" }) }),
      );
      expect(names(ranked)).toEqual(["Gentle House", "Terror House"]);
    });

    it("most fun Scare Zones", () => {
      const { ranked } = runAttractionQuery(
        ARCHIVE,
        query({ metric: "fun", filters: filters({ type: "scare_zone" }) }),
      );
      expect(names(ranked)).toEqual(["Carnival Zone", "Fog Zone"]);
    });

    it("lowest Theme scores", () => {
      const { ranked } = runAttractionQuery(ARCHIVE, query({ metric: "theme", direction: "asc" }));
      expect(names(ranked)[0]).toBe("Fog Zone");
    });

    it("highest scoring attractions in a specific year", () => {
      const { ranked } = runAttractionQuery(ARCHIVE, query({ filters: filters({ year: 2102 }) }));
      expect(names(ranked)).toEqual(["Carnival Zone", "Fog Zone"]);
    });

    it("most fun Orlando attractions", () => {
      const { ranked } = runAttractionQuery(
        ARCHIVE,
        query({ metric: "fun", filters: filters({ park: "orlando" }) }),
      );
      // Fog Zone ran at both parks, so it counts as an Orlando attraction too.
      expect(names(ranked)).toEqual(["Gentle House", "Carnival Zone", "Fog Zone"]);
    });

    it("best-scoring Originals", () => {
      const { ranked } = runAttractionQuery(
        ARCHIVE,
        query({ filters: filters({ ipType: "original" }) }),
      );
      expect(names(ranked)).toEqual(["Carnival Zone", "Terror House"]);
    });
  });

  describe("combinations nobody listed", () => {
    it("stacks year, type, park and IP together", () => {
      const { ranked, matchCount } = runAttractionQuery(
        ARCHIVE,
        query({
          filters: filters({
            year: 2102,
            type: "scare_zone",
            park: "orlando",
            ipType: "original",
          }),
        }),
      );

      expect(matchCount).toBe(1);
      expect(names(ranked)).toEqual(["Carnival Zone"]);
    });

    it("returns an empty ranking when a combination matches nothing", () => {
      const result = runAttractionQuery(
        ARCHIVE,
        query({ filters: filters({ year: 2101, type: "scare_zone" }) }),
      );

      expect(result.matchCount).toBe(0);
      expect(result.ranked).toEqual([]);
      expect(result.unrated).toEqual([]);
    });

    it("can match attractions that exist but have no reviews to rank", () => {
      const result = runAttractionQuery(
        ARCHIVE,
        query({ filters: filters({ year: 2103 }), reviewedOnly: false }),
      );

      expect(result.matchCount).toBe(1);
      expect(result.ranked).toEqual([]);
      expect(names(result.unrated)).toEqual(["Unrated House"]);
    });

    it("applies the direction within a filtered slice, not the whole archive", () => {
      const { ranked } = runAttractionQuery(
        ARCHIVE,
        query({ metric: "fun", direction: "asc", filters: filters({ park: "orlando" }) }),
      );
      expect(names(ranked)).toEqual(["Fog Zone", "Carnival Zone", "Gentle House"]);
    });
  });
});

describe("runYearQuery", () => {
  it("ranks years by the average of the metric across their reviewed attractions", () => {
    const rows = runYearQuery(ARCHIVE, DEFAULT_STATISTICS_FILTERS, "total", "desc");

    // 2101 averages (10 + 10) / 2 = 10; 2102 averages (11.5 + 6) / 2 = 8.75.
    expect(rows.map((row) => row.calendarYear)).toEqual([2101, 2102]);
    expect(rows[0].average).toBe(10);
    expect(rows[1].average).toBe(8.75);
    expect(rows.map((row) => row.rank)).toEqual([1, 2]);
  });

  it("states how many reviews each average rests on", () => {
    const rows = runYearQuery(ARCHIVE, DEFAULT_STATISTICS_FILTERS, "total", "desc");
    expect(rows.every((row) => row.reviewedCount === 2)).toBe(true);
  });

  it("leaves out a year with nothing reviewed rather than averaging it as zero", () => {
    const rows = runYearQuery(ARCHIVE, DEFAULT_STATISTICS_FILTERS, "total", "desc");
    expect(rows.map((row) => row.calendarYear)).not.toContain(2103);
  });

  it("can order lowest first", () => {
    const rows = runYearQuery(ARCHIVE, DEFAULT_STATISTICS_FILTERS, "total", "asc");
    expect(rows.map((row) => row.calendarYear)).toEqual([2102, 2101]);
  });

  it("ranks by a single dimension when asked", () => {
    const rows = runYearQuery(ARCHIVE, DEFAULT_STATISTICS_FILTERS, "fear", "desc");
    // 2102 averages fear (2 + 4) / 2 = 3; 2101 averages (5 + 1) / 2 = 3 — a tie,
    // broken by the most recent year.
    expect(rows[0].calendarYear).toBe(2102);
    expect(rows[0].average).toBe(3);
  });

  it("respects the same filters as the attraction query", () => {
    const rows = runYearQuery(ARCHIVE, filters({ park: "orlando" }), "total", "desc");

    // Only Gentle House counts for 2101 under an Orlando filter.
    const byYear = Object.fromEntries(rows.map((row) => [row.calendarYear, row]));
    expect(byYear[2101].average).toBe(10);
    expect(byYear[2101].reviewedCount).toBe(1);
    expect(byYear[2102].reviewedCount).toBe(2);
  });

  it("carries the event year's id so a row can link to its page", () => {
    const rows = runYearQuery(ARCHIVE, DEFAULT_STATISTICS_FILTERS, "total", "desc");
    expect(rows[0].eventYearId).toBe("y2101");
  });

  it("returns nothing when the filters match no reviewed attraction", () => {
    expect(runYearQuery(ARCHIVE, filters({ year: 2103 }), "total", "desc")).toEqual([]);
  });
});
