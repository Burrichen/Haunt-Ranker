import { ConstraintViolationError, NotFoundError, withDatabaseErrors } from "../database/errors";
import type { SqlExecutor } from "../database/types";
import type { Attraction, AttractionInput, AttractionType } from "../models/attraction";
import type { EntityId } from "../models/common";
import type { ParkId } from "../models/park";
import { generateId } from "./id";
import type { Repository } from "./types";

interface AttractionRow {
  id: string;
  event_year_id: string;
  attraction_type: AttractionType;
  name: string;
  slug: string;
  variant_name: string | null;
  ip_type: "original" | "licensed" | null;
  franchise_name: string | null;
  short_summary: string | null;
  full_overview: string | null;
  story_lore: string | null;
  experience_description: string | null;
  development_notes: string | null;
  opening_date: string | null;
  closing_date: string | null;
  location_notes: string | null;
  debut_year: number | null;
  is_sample: number;
  created_at: string;
  updated_at: string;
}

interface AttractionParkRow {
  attraction_id: string;
  park_id: string;
}

function mapRow(row: AttractionRow, parkIds: ParkId[]): Attraction {
  return {
    id: row.id,
    eventYearId: row.event_year_id,
    attractionType: row.attraction_type,
    name: row.name,
    slug: row.slug,
    variantName: row.variant_name,
    ipType: row.ip_type,
    franchiseName: row.franchise_name,
    shortSummary: row.short_summary,
    fullOverview: row.full_overview,
    storyLore: row.story_lore,
    experienceDescription: row.experience_description,
    developmentNotes: row.development_notes,
    openingDate: row.opening_date,
    closingDate: row.closing_date,
    locationNotes: row.location_notes,
    debutYear: row.debut_year,
    parkIds,
    isSample: row.is_sample === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * The three facts an attraction record is meaningless without. Everything
 * else — summaries, lore, dates, franchise, IP classification — is genuinely
 * optional, because the archive is built from partial knowledge and a
 * half-known attraction is still worth recording.
 *
 * These live here rather than in the admin forms on purpose: the form is a
 * convenience, this is the rule. Nothing that goes through a repository can
 * write a nameless, yearless or parkless attraction.
 */
function assertName(name: string): void {
  if (name.trim() === "") {
    throw new ConstraintViolationError("An attraction needs a name", "check");
  }
}

function assertEventYear(eventYearId: EntityId): void {
  if (eventYearId.trim() === "") {
    throw new ConstraintViolationError("An attraction needs an event year", "check");
  }
}

function assertParks(parkIds: ParkId[]): void {
  if (parkIds.length === 0) {
    throw new ConstraintViolationError(
      "An attraction needs at least one park — Hollywood, Orlando, or both",
      "check",
    );
  }
}

export type AttractionRepository = Repository<Attraction, AttractionInput> & {
  getByEventYear(eventYearId: EntityId): Promise<Attraction[]>;
  getByType(attractionType: AttractionType): Promise<Attraction[]>;
  setParks(attractionId: EntityId, parkIds: ParkId[]): Promise<void>;
};

export function createAttractionRepository(db: SqlExecutor): AttractionRepository {
  async function attachParkIds(rows: AttractionRow[]): Promise<Attraction[]> {
    if (rows.length === 0) {
      return [];
    }
    const placeholders = rows.map(() => "?").join(", ");
    const parkRows = await db.select<AttractionParkRow[]>(
      `SELECT attraction_id, park_id FROM attraction_parks WHERE attraction_id IN (${placeholders})`,
      rows.map((row) => row.id),
    );
    const parksByAttraction = new Map<string, ParkId[]>();
    for (const parkRow of parkRows) {
      const list = parksByAttraction.get(parkRow.attraction_id) ?? [];
      list.push(parkRow.park_id as ParkId);
      parksByAttraction.set(parkRow.attraction_id, list);
    }
    return rows.map((row) => mapRow(row, parksByAttraction.get(row.id) ?? []));
  }

  async function getAll(): Promise<Attraction[]> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<AttractionRow[]>("SELECT * FROM attractions ORDER BY name ASC");
      return attachParkIds(rows);
    });
  }

  async function getById(id: EntityId): Promise<Attraction | null> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<AttractionRow[]>("SELECT * FROM attractions WHERE id = ?", [id]);
      if (rows.length === 0) {
        return null;
      }
      const [attraction] = await attachParkIds(rows);
      return attraction;
    });
  }

  async function getByEventYear(eventYearId: EntityId): Promise<Attraction[]> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<AttractionRow[]>(
        "SELECT * FROM attractions WHERE event_year_id = ? ORDER BY name ASC",
        [eventYearId],
      );
      return attachParkIds(rows);
    });
  }

  async function getByType(attractionType: AttractionType): Promise<Attraction[]> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<AttractionRow[]>(
        "SELECT * FROM attractions WHERE attraction_type = ? ORDER BY name ASC",
        [attractionType],
      );
      return attachParkIds(rows);
    });
  }

  async function setParks(attractionId: EntityId, parkIds: ParkId[]): Promise<void> {
    // Guarded here too, not just in create/update — otherwise this would be
    // the hole through which an attraction loses its last park.
    assertParks(parkIds);
    await withDatabaseErrors(async () => {
      await db.execute("DELETE FROM attraction_parks WHERE attraction_id = ?", [attractionId]);
      const uniqueParkIds = Array.from(new Set(parkIds));
      if (uniqueParkIds.length === 0) {
        return;
      }
      const valuesSql = uniqueParkIds.map(() => "(?, ?)").join(", ");
      const params = uniqueParkIds.flatMap((parkId) => [attractionId, parkId]);
      await db.execute(
        `INSERT INTO attraction_parks (attraction_id, park_id) VALUES ${valuesSql}`,
        params,
      );
    });
  }

  async function create(input: AttractionInput): Promise<Attraction> {
    // Checked before the insert, so a rejected record never leaves a
    // half-written row behind.
    assertName(input.name);
    assertEventYear(input.eventYearId);
    assertParks(input.parkIds);

    const id = generateId();
    await withDatabaseErrors(() =>
      db.execute(
        `INSERT INTO attractions (
           id, event_year_id, attraction_type, name, slug, variant_name, ip_type,
           franchise_name, short_summary, full_overview, story_lore,
           experience_description, development_notes, opening_date, closing_date,
           location_notes, debut_year, is_sample
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          input.eventYearId,
          input.attractionType,
          input.name,
          input.slug,
          input.variantName ?? null,
          input.ipType ?? null,
          input.franchiseName ?? null,
          input.shortSummary ?? null,
          input.fullOverview ?? null,
          input.storyLore ?? null,
          input.experienceDescription ?? null,
          input.developmentNotes ?? null,
          input.openingDate ?? null,
          input.closingDate ?? null,
          input.locationNotes ?? null,
          input.debutYear ?? null,
          input.isSample ? 1 : 0,
        ],
      ),
    );
    await setParks(id, input.parkIds);
    // The season it belongs to is also the first season it appeared in.
    // Recording it here keeps "which seasons did this run in?" answerable
    // the same way for a record created today and one the migration
    // backfilled.
    await withDatabaseErrors(() =>
      db.execute(
        "INSERT OR IGNORE INTO season_appearances (attraction_id, season_id) VALUES (?, ?)",
        [id, input.eventYearId],
      ),
    );

    const created = await getById(id);
    if (!created) {
      throw new NotFoundError("Attraction", id);
    }
    return created;
  }

  async function update(id: EntityId, input: Partial<AttractionInput>): Promise<Attraction> {
    if (input.name !== undefined) {
      assertName(input.name);
    }
    if (input.eventYearId !== undefined) {
      assertEventYear(input.eventYearId);
    }
    if (input.parkIds !== undefined) {
      assertParks(input.parkIds);
    }

    const existing = await getById(id);
    if (!existing) {
      throw new NotFoundError("Attraction", id);
    }

    const next: Omit<AttractionInput, "parkIds"> = {
      eventYearId: input.eventYearId ?? existing.eventYearId,
      attractionType: input.attractionType ?? existing.attractionType,
      name: input.name ?? existing.name,
      slug: input.slug ?? existing.slug,
      variantName: input.variantName === undefined ? existing.variantName : input.variantName,
      ipType: input.ipType === undefined ? existing.ipType : input.ipType,
      franchiseName:
        input.franchiseName === undefined ? existing.franchiseName : input.franchiseName,
      shortSummary: input.shortSummary === undefined ? existing.shortSummary : input.shortSummary,
      fullOverview: input.fullOverview === undefined ? existing.fullOverview : input.fullOverview,
      storyLore: input.storyLore === undefined ? existing.storyLore : input.storyLore,
      experienceDescription:
        input.experienceDescription === undefined
          ? existing.experienceDescription
          : input.experienceDescription,
      developmentNotes:
        input.developmentNotes === undefined ? existing.developmentNotes : input.developmentNotes,
      openingDate: input.openingDate === undefined ? existing.openingDate : input.openingDate,
      closingDate: input.closingDate === undefined ? existing.closingDate : input.closingDate,
      locationNotes:
        input.locationNotes === undefined ? existing.locationNotes : input.locationNotes,
      debutYear: input.debutYear === undefined ? existing.debutYear : input.debutYear,
      isSample: input.isSample === undefined ? existing.isSample : input.isSample,
    };

    await withDatabaseErrors(() =>
      db.execute(
        `UPDATE attractions
         SET event_year_id = ?, attraction_type = ?, name = ?, slug = ?, variant_name = ?,
             ip_type = ?, franchise_name = ?, short_summary = ?, full_overview = ?,
             story_lore = ?, experience_description = ?, development_notes = ?,
             opening_date = ?, closing_date = ?, location_notes = ?, debut_year = ?,
             is_sample = ?,
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?`,
        [
          next.eventYearId,
          next.attractionType,
          next.name,
          next.slug,
          next.variantName ?? null,
          next.ipType ?? null,
          next.franchiseName ?? null,
          next.shortSummary ?? null,
          next.fullOverview ?? null,
          next.storyLore ?? null,
          next.experienceDescription ?? null,
          next.developmentNotes ?? null,
          next.openingDate ?? null,
          next.closingDate ?? null,
          next.locationNotes ?? null,
          next.debutYear ?? null,
          next.isSample ? 1 : 0,
          id,
        ],
      ),
    );

    if (input.parkIds !== undefined) {
      await setParks(id, input.parkIds);
    }

    // Correcting which season a record belongs to moves its own appearance
    // with it. Any other season it appeared in is a separate fact and is
    // left alone.
    if (next.eventYearId !== existing.eventYearId) {
      await withDatabaseErrors(async () => {
        await db.execute(
          "DELETE FROM season_appearances WHERE attraction_id = ? AND season_id = ?",
          [id, existing.eventYearId],
        );
        await db.execute(
          "INSERT OR IGNORE INTO season_appearances (attraction_id, season_id) VALUES (?, ?)",
          [id, next.eventYearId],
        );
      });
    }

    const updated = await getById(id);
    if (!updated) {
      throw new NotFoundError("Attraction", id);
    }
    return updated;
  }

  async function deleteById(id: EntityId): Promise<void> {
    await withDatabaseErrors(() => db.execute("DELETE FROM attractions WHERE id = ?", [id]));
  }

  return {
    getAll,
    getById,
    getByEventYear,
    getByType,
    setParks,
    create,
    update,
    delete: deleteById,
  };
}
