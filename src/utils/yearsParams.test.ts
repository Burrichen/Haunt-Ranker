import { describe, expect, it } from "vitest";
import {
  DEFAULT_YEARS_PARAMS,
  parseYearsParams,
  yearsParamsToSearchParams,
  type YearsParams,
} from "./yearsParams";

describe("years URL params", () => {
  it("defaults to the overview, ordered by average total", () => {
    const parsed = parseYearsParams(new URLSearchParams());

    expect(parsed.view).toBe("overview");
    expect(parsed.sort).toEqual({ metric: "total", direction: "desc" });
  });

  it("writes nothing for a default view", () => {
    expect(yearsParamsToSearchParams(DEFAULT_YEARS_PARAMS).toString()).toBe("");
  });

  it("round-trips the rankings view with a chosen metric and direction", () => {
    const params: YearsParams = {
      view: "rankings",
      sort: { metric: "fear", direction: "asc" },
    };

    expect(parseYearsParams(yearsParamsToSearchParams(params))).toEqual(params);
  });

  it("falls back to the defaults for values that aren't valid", () => {
    const parsed = parseYearsParams(new URLSearchParams("view=charts&metric=vibes&dir=sideways"));

    expect(parsed).toEqual(DEFAULT_YEARS_PARAMS);
  });
});
