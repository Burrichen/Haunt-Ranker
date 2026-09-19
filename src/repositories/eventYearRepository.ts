import { ConstraintViolationError, NotFoundError, withDatabaseErrors } from "../database/errors";
import type { SqlExecutor } from "../database/types";
import type { EntityId } from "../models/common";
import type { EventYear, EventYearInput } from "../models/eventYear";
import { generateId } from "./id";
import type { Repository } from "./types";

interface EventYearRow {
  id: string;
  calendar_year: number;
  name: string;
  description: string | null;
  source_notes: string | null;
  starts_on: string | null;
  ends_on: string | null;
  is_sample: number;
  created_at: string;
  updated_at: string;
}

function mapRow(row: EventYearRow): EventYear {
  return {
    id: row.id,
    calendarYear: row.calendar_year,
    name: row.name,
    description: row.description,
    sourceNotes: row.source_notes,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    isSample: row.is_sample === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Wide enough to record anything real or planned, narrow enough to catch a typo'd year. */
const MIN_CALENDAR_YEAR = 1900;
const MAX_CALENDAR_YEAR = 2200;

function assertName(name: string): void {
  if (name.trim() === "") {
    throw new ConstraintViolationError("An event year needs a name", "check");
  }
}

function assertCalendarYear(calendarYear: number): void {
  if (
    !Number.isInteger(calendarYear) ||
    calendarYear < MIN_CALENDAR_YEAR ||
    calendarYear > MAX_CALENDAR_YEAR
  ) {
    throw new ConstraintViolationError(
      `An event year needs a whole calendar year between ${MIN_CALENDAR_YEAR} and ${MAX_CALENDAR_YEAR}`,
      "check",
    );
  }
}

export type EventYearRepository = Repository<EventYear, EventYearInput> & {
  getByCalendarYear(calendarYear: number): Promise<EventYear[]>;
};

export function createEventYearRepository(db: SqlExecutor): EventYearRepository {
  async function getAll(): Promise<EventYear[]> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<EventYearRow[]>(
        "SELECT * FROM event_years ORDER BY calendar_year DESC, name ASC",
      );
      return rows.map(mapRow);
    });
  }

  async function getById(id: EntityId): Promise<EventYear | null> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<EventYearRow[]>("SELECT * FROM event_years WHERE id = ?", [id]);
      return rows[0] ? mapRow(rows[0]) : null;
    });
  }

  async function getByCalendarYear(calendarYear: number): Promise<EventYear[]> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<EventYearRow[]>(
        "SELECT * FROM event_years WHERE calendar_year = ? ORDER BY name ASC",
        [calendarYear],
      );
      return rows.map(mapRow);
    });
  }

  async function create(input: EventYearInput): Promise<EventYear> {
    assertName(input.name);
    assertCalendarYear(input.calendarYear);

    const id = generateId();
    await withDatabaseErrors(() =>
      db.execute(
        `INSERT INTO event_years (id, calendar_year, name, description, source_notes,
                                  starts_on, ends_on, is_sample)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          input.calendarYear,
          input.name,
          input.description ?? null,
          input.sourceNotes ?? null,
          input.startsOn ?? null,
          input.endsOn ?? null,
          input.isSample ? 1 : 0,
        ],
      ),
    );
    const created = await getById(id);
    if (!created) {
      throw new NotFoundError("EventYear", id);
    }
    return created;
  }

  async function update(id: EntityId, input: Partial<EventYearInput>): Promise<EventYear> {
    if (input.name !== undefined) {
      assertName(input.name);
    }
    if (input.calendarYear !== undefined) {
      assertCalendarYear(input.calendarYear);
    }

    const existing = await getById(id);
    if (!existing) {
      throw new NotFoundError("EventYear", id);
    }

    const next: EventYearInput = {
      calendarYear: input.calendarYear ?? existing.calendarYear,
      name: input.name ?? existing.name,
      description: input.description === undefined ? existing.description : input.description,
      sourceNotes: input.sourceNotes === undefined ? existing.sourceNotes : input.sourceNotes,
      startsOn: input.startsOn === undefined ? existing.startsOn : input.startsOn,
      endsOn: input.endsOn === undefined ? existing.endsOn : input.endsOn,
      isSample: input.isSample === undefined ? existing.isSample : input.isSample,
    };

    await withDatabaseErrors(() =>
      db.execute(
        `UPDATE event_years
         SET calendar_year = ?, name = ?, description = ?, source_notes = ?,
             starts_on = ?, ends_on = ?, is_sample = ?,
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?`,
        [
          next.calendarYear,
          next.name,
          next.description ?? null,
          next.sourceNotes ?? null,
          next.startsOn ?? null,
          next.endsOn ?? null,
          next.isSample ? 1 : 0,
          id,
        ],
      ),
    );

    const updated = await getById(id);
    if (!updated) {
      throw new NotFoundError("EventYear", id);
    }
    return updated;
  }

  async function deleteById(id: EntityId): Promise<void> {
    await withDatabaseErrors(() => db.execute("DELETE FROM event_years WHERE id = ?", [id]));
  }

  return { getAll, getById, getByCalendarYear, create, update, delete: deleteById };
}
