import { describe, expect, it } from "vitest";
import { buildRegistry } from "../hooks/useHauntRegistry";
import type { ExperienceType } from "./experienceType";
import {
  ALL_HAUNTS,
  combineLabels,
  DEFAULT_HAUNT_SCOPE,
  genericTypeLabel,
  HAUNT_IDS,
  isInHauntScope,
  scopeHauntId,
  type Haunt,
} from "./haunt";
import type { Venue } from "./park";

/**
 * The vocabulary rules, now that a haunt's words are rows rather than a
 * lookup in the source code. These are what make an imported haunt read
 * correctly: nothing here names a haunt, and everything follows the data.
 */
const TIMESTAMPS = {
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function haunt(id: string, name: string, shortName: string, sortOrder: number): Haunt {
  return {
    id,
    name,
    shortName,
    description: null,
    tagline: null,
    accent: "orange",
    venuesLabel: null,
    sortOrder,
    packId: null,
    packVersion: null,
    packUpdatedAt: null,
    ...TIMESTAMPS,
  };
}

function type(
  id: string,
  hauntId: string,
  category: ExperienceType["category"],
  labelOne: string,
  labelMany: string,
): ExperienceType {
  return {
    id,
    hauntId,
    category,
    labelOne,
    labelMany,
    description: null,
    sortOrder: 0,
    packId: null,
    ...TIMESTAMPS,
  };
}

function venue(id: string, name: string, hauntId: string): Venue {
  return { id, name, hauntId, icon: "pin", sortOrder: 0, packId: null };
}

/** Two installed haunts and one that arrived as a pack. */
const REGISTRY = buildRegistry({
  haunts: [
    haunt(HAUNT_IDS.hhn, "Halloween Horror Nights", "HHN", 0),
    haunt(HAUNT_IDS.knotts, "Knott's Scary Farm", "Knott's", 10),
    haunt("mff", "Moonlight Fright Festival", "Moonlight", 100),
  ],
  venues: [
    venue("hollywood", "Hollywood", HAUNT_IDS.hhn),
    venue("mff:grounds", "The Grounds", "mff"),
  ],
  experienceTypes: [
    type("hhn:type:house", HAUNT_IDS.hhn, "house", "House", "Houses"),
    type("hhn:type:zone", HAUNT_IDS.hhn, "scare_zone", "Scare Zone", "Scare Zones"),
    type("knotts:type:maze", HAUNT_IDS.knotts, "house", "Maze", "Mazes"),
    type("mff:type:trail", "mff", "house", "Trail", "Trails"),
    type("mff:type:show", "mff", "show", "Show", "Shows"),
  ],
});

describe("a haunt's own words", () => {
  it("calls a walk-through whatever its haunt calls it", () => {
    expect(REGISTRY.label("house", HAUNT_IDS.hhn)).toBe("House");
    expect(REGISTRY.label("house", HAUNT_IDS.hhn, "many")).toBe("Houses");
    expect(REGISTRY.label("house", HAUNT_IDS.knotts, "many")).toBe("Mazes");
    // A haunt the app has never heard of, reading correctly from its rows.
    expect(REGISTRY.label("house", "mff", "many")).toBe("Trails");
  });

  it("reads out every word where a list spans haunts", () => {
    expect(REGISTRY.label("house", null, "many")).toBe("Houses, Mazes & Trails");
  });

  it("falls back to the generic word rather than a list nobody would read", () => {
    const many = buildRegistry({
      haunts: [],
      venues: [],
      experienceTypes: [
        type("a:t", "a", "house", "House", "Houses"),
        type("b:t", "b", "house", "Maze", "Mazes"),
        type("c:t", "c", "house", "Trail", "Trails"),
        type("d:t", "d", "house", "Hayride", "Hayrides"),
      ],
    });

    expect(many.label("house", null, "many")).toBe("Walk-throughs");
  });

  it("uses the generic word where a haunt has no type of that kind", () => {
    expect(REGISTRY.label("scare_zone", HAUNT_IDS.knotts)).toBe("Scare Zone");
    expect(REGISTRY.label("show", HAUNT_IDS.hhn)).toBe("Show");
  });

  it("never exposes the database's own word for a category", () => {
    for (const hauntId of [HAUNT_IDS.hhn, "mff", null]) {
      for (const form of ["one", "many"] as const) {
        expect(REGISTRY.label("house", hauntId, form)).not.toMatch(/walkthrough|house_/i);
        expect(REGISTRY.label("scare_zone", hauntId, form)).not.toMatch(/_/);
      }
    }
  });

  it("offers each haunt only the categories it actually has", () => {
    expect(REGISTRY.categories(HAUNT_IDS.hhn)).toEqual(["house", "scare_zone"]);
    expect(REGISTRY.categories("mff")).toEqual(["house", "show"]);
  });
});

describe("the registry", () => {
  it("lists haunts in presentation order, home collection first", () => {
    expect(REGISTRY.haunts.map((entry) => entry.id)).toEqual([
      HAUNT_IDS.hhn,
      HAUNT_IDS.knotts,
      "mff",
    ]);
  });

  it("offers a scope per haunt, whatever they are", () => {
    expect(REGISTRY.scopes()).toEqual([ALL_HAUNTS, HAUNT_IDS.hhn, HAUNT_IDS.knotts, "mff"]);
    expect(REGISTRY.scopeLabel(ALL_HAUNTS)).toBe("All Haunts");
    expect(REGISTRY.scopeLabel("mff")).toBe("Moonlight Fright Festival");
    expect(REGISTRY.scopeLabel("mff", "short")).toBe("Moonlight");
  });

  it("gives each haunt only its own venues", () => {
    expect(REGISTRY.venuesFor("mff").map((entry) => entry.id)).toEqual(["mff:grounds"]);
    expect(REGISTRY.venueName("mff:grounds")).toBe("The Grounds");
  });

  it("answers for a haunt it doesn't hold without pretending otherwise", () => {
    expect(REGISTRY.haunt("halloween-haunt")).toBeNull();
    expect(REGISTRY.hauntName("halloween-haunt")).toBeNull();
    expect(REGISTRY.venueName("nowhere")).toBe("nowhere");
  });

  it("knows nothing before it has loaded, rather than assuming two haunts", () => {
    const empty = buildRegistry({ haunts: [], venues: [], experienceTypes: [] });

    expect(empty.haunts).toEqual([]);
    expect(empty.scopes()).toEqual([ALL_HAUNTS]);
    expect(empty.label("house", null, "many")).toBe(genericTypeLabel("house", "many"));
  });
});

describe("the haunt scope", () => {
  it("opens on the home collection", () => {
    expect(DEFAULT_HAUNT_SCOPE).toBe(HAUNT_IDS.hhn);
    expect(scopeHauntId(DEFAULT_HAUNT_SCOPE)).toBe(HAUNT_IDS.hhn);
    expect(scopeHauntId(ALL_HAUNTS)).toBeNull();
  });

  it("shows everything under All Haunts and only its own under a haunt", () => {
    expect(isInHauntScope("mff", ALL_HAUNTS)).toBe(true);
    expect(isInHauntScope("mff", "mff")).toBe(true);
    expect(isInHauntScope("mff", HAUNT_IDS.hhn)).toBe(false);
    expect(isInHauntScope(null, HAUNT_IDS.hhn)).toBe(false);
  });
});

describe("combineLabels", () => {
  it("joins what there is, and gives up gracefully when there's too much", () => {
    expect(combineLabels([], "Walk-throughs")).toBe("Walk-throughs");
    expect(combineLabels(["Houses"], "Walk-throughs")).toBe("Houses");
    expect(combineLabels(["Houses", "Mazes"], "Walk-throughs")).toBe("Houses & Mazes");
    expect(combineLabels(["Houses", "Houses"], "Walk-throughs")).toBe("Houses");
    expect(combineLabels(["A", "B", "C", "D"], "Walk-throughs")).toBe("Walk-throughs");
  });
});
