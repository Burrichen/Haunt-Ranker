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

  it("is seeded with exactly Hollywood and Orlando", async () => {
    const all = await parks.getAll();

    expect(all.map((park) => park.id).sort()).toEqual(["hollywood", "orlando"]);
    expect(all.map((park) => park.name).sort()).toEqual(["Hollywood", "Orlando"]);
  });
});
