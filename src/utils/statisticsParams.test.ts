import { describe, expect, it } from "vitest";
import {
  DEFAULT_STATISTICS_PARAMS,
  parseStatisticsParams,
  statisticsParamsToSearchParams,
  type StatisticsParams,
} from "./statisticsParams";

describe("statistics URL params", () => {
  it("defaults to every year, every attraction, total, best", () => {
    const parsed = parseStatisticsParams(new URLSearchParams());

    expect(parsed).toEqual(DEFAULT_STATISTICS_PARAMS);
    expect(parsed.filters.year).toBeNull();
    expect(parsed.filters.type).toBeNull();
  });

  it("writes nothing for a default view", () => {
    expect(statisticsParamsToSearchParams(DEFAULT_STATISTICS_PARAMS).toString()).toBe("");
  });

  it("round-trips a fully specified dashboard", () => {
    const params: StatisticsParams = {
      view: "explorer",
      filters: { year: 2101, type: "scare_zone", park: "orlando", ipType: "licensed" },
      metric: "fear",
      highlightMode: "lowest",
      subject: "years",
      direction: "asc",
      reviewedOnly: false,
    };

    expect(parseStatisticsParams(statisticsParamsToSearchParams(params))).toEqual(params);
  });

  it("keeps the slice when switching between the dashboard and the explorer", () => {
    const sliced = statisticsParamsToSearchParams({
      ...DEFAULT_STATISTICS_PARAMS,
      view: "explorer",
      filters: { year: 2103, type: "house", park: "hollywood", ipType: "original" },
    });

    // The facets are written once and read the same way by either view.
    expect(parseStatisticsParams(sliced).filters).toEqual({
      year: 2103,
      type: "house",
      park: "hollywood",
      ipType: "original",
    });
  });

  it("falls back to the defaults for values that aren't valid", () => {
    const parsed = parseStatisticsParams(
      new URLSearchParams("year=soon&type=ride&park=mars&ip=bootleg&metric=vibes&highlight=meh"),
    );

    expect(parsed).toEqual(DEFAULT_STATISTICS_PARAMS);
  });
});
