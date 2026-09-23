import { describe, expect, it } from "vitest";
import {
  attractionTypeLabel,
  DEFAULT_HAUNT_SCOPE,
  HAUNT_IDS,
  hauntScopeLabel,
  isHauntScope,
  isInHauntScope,
  scopeHauntId,
} from "./haunt";

/**
 * The haunt vocabulary and the scope rule, which between them decide what
 * every page is called and what it shows.
 */
describe("attractionTypeLabel", () => {
  it("gives each haunt its own word for a walk-through", () => {
    expect(attractionTypeLabel("house", HAUNT_IDS.hhn)).toBe("House");
    expect(attractionTypeLabel("house", HAUNT_IDS.hhn, "many")).toBe("Houses");
    expect(attractionTypeLabel("house", HAUNT_IDS.knotts)).toBe("Maze");
    expect(attractionTypeLabel("house", HAUNT_IDS.knotts, "many")).toBe("Mazes");
  });

  it("uses wording that fits both where a list spans them", () => {
    expect(attractionTypeLabel("house", null, "many")).toBe("Houses & Mazes");
  });

  it("calls a scare zone a scare zone everywhere", () => {
    expect(attractionTypeLabel("scare_zone", HAUNT_IDS.hhn, "many")).toBe("Scare Zones");
    expect(attractionTypeLabel("scare_zone", HAUNT_IDS.knotts, "many")).toBe("Scare Zones");
    expect(attractionTypeLabel("scare_zone", null, "many")).toBe("Scare Zones");
  });

  it("never exposes the database's own word for the type", () => {
    for (const haunt of [HAUNT_IDS.hhn, HAUNT_IDS.knotts, null]) {
      for (const form of ["one", "many"] as const) {
        expect(attractionTypeLabel("house", haunt, form)).not.toMatch(/house_|walkthrough/i);
        expect(attractionTypeLabel("scare_zone", haunt, form)).not.toMatch(/_/);
      }
    }
  });
});

describe("the haunt scope", () => {
  it("defaults to both haunts rather than to either one", () => {
    expect(DEFAULT_HAUNT_SCOPE).toBe("all");
    expect(scopeHauntId(DEFAULT_HAUNT_SCOPE)).toBeNull();
  });

  it("names itself in full and in short", () => {
    expect(hauntScopeLabel("all")).toBe("All Haunts");
    expect(hauntScopeLabel(HAUNT_IDS.hhn)).toBe("Halloween Horror Nights");
    expect(hauntScopeLabel(HAUNT_IDS.hhn, "short")).toBe("HHN");
    expect(hauntScopeLabel(HAUNT_IDS.knotts, "short")).toBe("Knott's");
  });

  it("recognises only the scopes this build has", () => {
    expect(isHauntScope("hhn")).toBe(true);
    expect(isHauntScope("halloween-haunt")).toBe(false);
    expect(isHauntScope(null)).toBe(false);
  });

  it("shows everything under All Haunts and only its own under a haunt", () => {
    expect(isInHauntScope(HAUNT_IDS.knotts, "all")).toBe(true);
    expect(isInHauntScope(HAUNT_IDS.hhn, "all")).toBe(true);
    expect(isInHauntScope(HAUNT_IDS.hhn, HAUNT_IDS.hhn)).toBe(true);
    expect(isInHauntScope(HAUNT_IDS.knotts, HAUNT_IDS.hhn)).toBe(false);
  });

  it("leaves a record with no haunt out of a haunt's archive", () => {
    expect(isInHauntScope(null, HAUNT_IDS.hhn)).toBe(false);
    expect(isInHauntScope(undefined, "all")).toBe(true);
  });
});
