import { describe, expect, it } from "vitest";
import type { SeasonAppearance } from "../models/seasonAppearance";
import { classifySeasonLineage, placeInSeason } from "./seasonLineage";

/**
 * A season page asks which attractions were new and which came back. The
 * rule these tests hold to is that the archive answers only from what it
 * has recorded — a debut year somebody established, or an appearance in an
 * earlier season — and says nothing where it knows nothing.
 */
const SEASON_2023 = { id: "knotts-2023", calendarYear: 2023 };
const SEASON_2024 = { id: "knotts-2024", calendarYear: 2024 };
const SEASON_YEARS = new Map([
  [SEASON_2023.id, 2023],
  [SEASON_2024.id, 2024],
]);

function appearance(attractionId: string, seasonId: string): SeasonAppearance {
  return { attractionId, seasonId, notes: null, createdAt: "2026-01-01T00:00:00.000Z" };
}

describe("placeInSeason", () => {
  it("calls an attraction new when its debut year is this season", () => {
    const placement = placeInSeason(
      { id: "a1", debutYear: 2024 },
      SEASON_2024,
      [appearance("a1", SEASON_2024.id)],
      SEASON_YEARS,
    );

    expect(placement).toBe("new");
  });

  it("calls it returning when its debut year is earlier", () => {
    const placement = placeInSeason(
      { id: "a1", debutYear: 2019 },
      SEASON_2024,
      [appearance("a1", SEASON_2024.id)],
      SEASON_YEARS,
    );

    expect(placement).toBe("returning");
  });

  it("calls it returning on the evidence of an earlier appearance", () => {
    const placement = placeInSeason(
      { id: "a1", debutYear: null },
      SEASON_2024,
      [appearance("a1", SEASON_2023.id), appearance("a1", SEASON_2024.id)],
      SEASON_YEARS,
    );

    expect(placement).toBe("returning");
  });

  it("leaves it unknown when the archive has only ever seen this season", () => {
    // The absence of an earlier appearance is not evidence that there
    // wasn't one — the archive may simply not hold that year yet.
    const placement = placeInSeason(
      { id: "a1", debutYear: null },
      SEASON_2024,
      [appearance("a1", SEASON_2024.id)],
      SEASON_YEARS,
    );

    expect(placement).toBe("unknown");
  });

  it("doesn't take another attraction's history as its own", () => {
    const placement = placeInSeason(
      { id: "a1", debutYear: null },
      SEASON_2024,
      [appearance("a2", SEASON_2023.id), appearance("a1", SEASON_2024.id)],
      SEASON_YEARS,
    );

    expect(placement).toBe("unknown");
  });
});

describe("classifySeasonLineage", () => {
  const items = [
    { attraction: { id: "new-one", debutYear: 2024 } },
    { attraction: { id: "back-again", debutYear: 2016 } },
    { attraction: { id: "unrecorded", debutYear: null } },
  ];

  it("splits a season into what is known, and reports what isn't", () => {
    const lineage = classifySeasonLineage(
      items,
      SEASON_2024,
      [appearance("unrecorded", SEASON_2024.id)],
      SEASON_YEARS,
    );

    expect(lineage.newThisYear.map((item) => item.attraction.id)).toEqual(["new-one"]);
    expect(lineage.returning.map((item) => item.attraction.id)).toEqual(["back-again"]);
    expect(lineage.unclassified.map((item) => item.attraction.id)).toEqual(["unrecorded"]);
    expect(lineage.isIncomplete).toBe(true);
  });

  it("is complete only when every record could be placed", () => {
    const lineage = classifySeasonLineage(items.slice(0, 2), SEASON_2024, [], SEASON_YEARS);

    expect(lineage.isIncomplete).toBe(false);
    expect(lineage.unclassified).toEqual([]);
  });
});
