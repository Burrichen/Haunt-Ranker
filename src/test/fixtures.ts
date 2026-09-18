import type { Attraction, AttractionInput } from "../models/attraction";
import type { EventYear } from "../models/eventYear";
import type { SqlExecutor } from "../database/types";
import { createAttractionRepository } from "../repositories/attractionRepository";
import { createEventYearRepository } from "../repositories/eventYearRepository";

/** A minimal, valid event year for tests that just need one to exist. */
export async function createFixtureEventYear(
  db: SqlExecutor,
  overrides: Partial<{ calendarYear: number; name: string }> = {},
): Promise<EventYear> {
  const repo = createEventYearRepository(db);
  return repo.create({
    calendarYear: overrides.calendarYear ?? 2024,
    name: overrides.name ?? "Halloween Horror Nights 2024",
  });
}

/** A minimal, valid attraction for tests that just need one to exist. */
export async function createFixtureAttraction(
  db: SqlExecutor,
  eventYearId: string,
  overrides: Partial<AttractionInput> = {},
): Promise<Attraction> {
  const repo = createAttractionRepository(db);
  return repo.create({
    eventYearId,
    attractionType: "house",
    name: "Test House",
    slug: "test-house",
    parkIds: ["hollywood"],
    ...overrides,
  });
}
