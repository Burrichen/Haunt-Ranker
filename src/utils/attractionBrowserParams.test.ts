import { describe, expect, it } from "vitest";
import { DEFAULT_FILTERS, DEFAULT_SORT, type AttractionBrowserFilters } from "./attractionBrowser";
import {
  attractionBrowserParamsToSearchParams,
  parseAttractionBrowserParams,
} from "./attractionBrowserParams";

describe("parseAttractionBrowserParams", () => {
  it("returns the defaults for an empty search", () => {
    const { filters, sort } = parseAttractionBrowserParams(new URLSearchParams());
    expect(filters).toEqual(DEFAULT_FILTERS);
    expect(sort).toBe(DEFAULT_SORT);
  });

  it("parses every filter and the sort option", () => {
    const params = new URLSearchParams(
      "q=manor&year=2101,2103&park=hollywood,both&ip=original&rated=unrated&min=5&max=12&sort=total-desc",
    );

    const { filters, sort } = parseAttractionBrowserParams(params);

    expect(filters).toEqual({
      query: "manor",
      years: [2101, 2103],
      parks: ["hollywood", "both"],
      ipTypes: ["original"],
      rated: ["unrated"],
      ratingMin: 5,
      ratingMax: 12,
    });
    expect(sort).toBe("total-desc");
  });

  it("silently drops unknown/invalid values instead of throwing", () => {
    const params = new URLSearchParams("park=neptune,hollywood&ip=bogus&sort=not-a-real-sort");
    const { filters, sort } = parseAttractionBrowserParams(params);

    expect(filters.parks).toEqual(["hollywood"]);
    expect(filters.ipTypes).toEqual([]);
    expect(sort).toBe(DEFAULT_SORT);
  });

  it("clamps an out-of-range rating boundary", () => {
    const params = new URLSearchParams("min=-10&max=999");
    const { filters } = parseAttractionBrowserParams(params);

    expect(filters.ratingMin).toBe(0);
    expect(filters.ratingMax).toBe(15);
  });
});

describe("attractionBrowserParamsToSearchParams", () => {
  it("produces an empty string for the defaults — a tidy URL", () => {
    const params = attractionBrowserParamsToSearchParams(DEFAULT_FILTERS, DEFAULT_SORT);
    expect(params.toString()).toBe("");
  });

  it("round-trips through parse and back", () => {
    const original: AttractionBrowserFilters = {
      query: "crypt",
      years: [2101],
      parks: ["both"],
      ipTypes: ["licensed"],
      rated: ["rated"],
      ratingMin: 3,
      ratingMax: 10,
    };

    const params = attractionBrowserParamsToSearchParams(original, "year-asc");
    const { filters, sort } = parseAttractionBrowserParams(params);

    expect(filters).toEqual(original);
    expect(sort).toBe("year-asc");
  });
});
