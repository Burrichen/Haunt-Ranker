import { describe, expect, it } from "vitest";
import { findIdentityClash, identityName } from "./attractionIdentity";

describe("identityName", () => {
  it("ignores only case, surrounding spaces and runs of spaces", () => {
    expect(identityName("  The   Hollow  Chapel ")).toBe("the hollow chapel");
    expect(identityName("The Hollow Chapel.")).toBe("the hollow chapel.");
    expect(identityName("The Hollow-Chapel")).toBe("the hollow-chapel");
  });
});

describe("findIdentityClash", () => {
  const hhn2023 = { id: "a", hauntId: "hhn", seasonId: "hhn-2023", name: "Stranger Things" };

  it("finds the same HHN name in the same season, whatever the case or spacing", () => {
    const candidate = { hauntId: "hhn", seasonId: "hhn-2023", name: "stranger  things " };
    expect(findIdentityClash(candidate, [hhn2023])).toBe(hhn2023);
  });

  it("lets an HHN name be reused in another season", () => {
    const candidate = { hauntId: "hhn", seasonId: "hhn-2019", name: "Stranger Things" };
    expect(findIdentityClash(candidate, [hhn2023])).toBeNull();
  });

  it("never matches a record against itself", () => {
    expect(findIdentityClash(hhn2023, [hhn2023])).toBeNull();
  });

  it("finds a Knott's maze already archived from another season", () => {
    const stored = { id: "m", hauntId: "knotts-scary-farm", seasonId: "ksf-2024", name: "Room 13" };
    const candidate = { hauntId: "knotts-scary-farm", seasonId: "ksf-2026", name: "Room 13" };
    expect(findIdentityClash(candidate, [stored])).toBe(stored);
  });

  it("treats a Knott's title with a different known debut as a different maze", () => {
    const stored = {
      id: "m",
      hauntId: "knotts-scary-farm",
      seasonId: "ksf-2024",
      name: "The Gauntlet",
      debutYear: 2001,
    };
    const candidate = { ...stored, id: undefined, seasonId: "ksf-2025", debutYear: 2025 };
    expect(findIdentityClash(candidate, [stored])).toBeNull();
    // One unknown debut is not evidence of a different maze.
    expect(findIdentityClash({ ...candidate, debutYear: null }, [stored])).toBe(stored);
  });

  it("never matches across haunts", () => {
    const candidate = {
      hauntId: "knotts-scary-farm",
      seasonId: "ksf-2023",
      name: "Stranger Things",
    };
    expect(findIdentityClash(candidate, [hhn2023])).toBeNull();
  });
});
