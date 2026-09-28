import { describe, expect, it } from "vitest";
import {
  DEFAULT_RANKINGS_PARAMS,
  parseRankingsParams,
  rankingsParamsToSearchParams,
  type RankingsParams,
} from "./rankingsParams";

function roundTrip(params: RankingsParams): RankingsParams {
  return parseRankingsParams(rankingsParamsToSearchParams(params));
}

describe("rankings URL params", () => {
  it("defaults to the Houses group with no pinned mode", () => {
    const parsed = parseRankingsParams(new URLSearchParams());

    expect(parsed.group).toBe("houses");
    // No mode in the URL means the page decides, so a saved manual ranking
    // can take precedence.
    expect(parsed.mode).toBeNull();
    expect(parsed.sort).toEqual({ metric: "total", direction: "desc" });
    expect(parsed.filters).toEqual(DEFAULT_RANKINGS_PARAMS.filters);
  });

  it("writes nothing for a default view", () => {
    expect(rankingsParamsToSearchParams(DEFAULT_RANKINGS_PARAMS).toString()).toBe("");
  });

  it("round-trips a fully specified view", () => {
    const params: RankingsParams = {
      group: "houses",
      haunt: "hhn",
      mode: "manual",
      filters: {
        years: [2101, 2102],
        parks: ["both"],
        ipTypes: ["licensed"],
      },
      sort: { metric: "fear", direction: "asc" },
    };

    expect(roundTrip(params)).toEqual(params);
  });

  it("keeps an explicitly pinned calculated mode", () => {
    const parsed = parseRankingsParams(new URLSearchParams("mode=calculated"));
    expect(parsed.mode).toBe("calculated");
  });

  it("ignores values that aren't valid", () => {
    const parsed = parseRankingsParams(
      new URLSearchParams(
        "group=nonsense&mode=sideways&park=mars,hollywood&ip=bootleg&type=ride&metric=vibes&dir=sideways",
      ),
    );

    expect(parsed.group).toBe("houses");
    expect(parsed.mode).toBeNull();
    expect(parsed.filters.parks).toEqual(["hollywood"]);
    expect(parsed.filters.ipTypes).toEqual([]);
    expect(parsed.sort).toEqual({ metric: "total", direction: "desc" });
  });

  it("ignores the retired group and type params from an old link", () => {
    const parsed = parseRankingsParams(new URLSearchParams("group=all&type=scare_zone"));

    expect(parsed).toEqual(parseRankingsParams(new URLSearchParams()));
    expect(parsed.group).toBe("houses");
    expect(parsed.filters).toEqual(DEFAULT_RANKINGS_PARAMS.filters);
  });

  it("drops year values that aren't numbers", () => {
    const parsed = parseRankingsParams(new URLSearchParams("year=2101,soon,2102"));
    expect(parsed.filters.years).toEqual([2101, 2102]);
  });
});
