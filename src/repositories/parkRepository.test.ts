// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { createTestDatabase } from "../test/createTestDatabase";
import type { SqlExecutor } from "../database/types";
import { createParkRepository, type ParkRepository } from "./parkRepository";

describe("ParkRepository", () => {
  let db: SqlExecutor;
  let parks: ParkRepository;

  beforeEach(() => {
    db = createTestDatabase();
    parks = createParkRepository(db);
  });

  it("is seeded with one venue per place the two haunts run", async () => {
    const all = await parks.getAll();

    expect(all.map((park) => park.id).sort()).toEqual([
      "hollywood",
      "knotts-berry-farm",
      "orlando",
    ]);
    expect(all.map((park) => park.name).sort()).toEqual([
      "Hollywood",
      "Knott's Berry Farm",
      "Orlando",
    ]);
  });

  it("says which haunt each venue belongs to", async () => {
    const byId = new Map((await parks.getAll()).map((park) => [park.id, park.hauntId]));

    expect(byId.get("hollywood")).toBe("hhn");
    expect(byId.get("orlando")).toBe("hhn");
    expect(byId.get("knotts-berry-farm")).toBe("knotts-scary-farm");
  });
});
