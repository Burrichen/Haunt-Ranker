import { withDatabaseErrors } from "../database/errors";
import type { SqlExecutor } from "../database/types";
import type { AttractionType } from "../models/attraction";
import type { ExperienceType, ExperienceTypeInput } from "../models/experienceType";
import type { HauntId } from "../models/haunt";

interface ExperienceTypeRow {
  id: string;
  haunt_id: string;
  category: string;
  label_one: string;
  label_many: string;
  description: string | null;
  sort_order: number;
  pack_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * The stored category name and the app's differ for exactly one value: the
 * database says `walkthrough`, and every attraction row says `house`. They
 * are translated here, in one place, rather than either name leaking into
 * the other's world.
 */
function toCategory(stored: string): AttractionType {
  return stored === "walkthrough" ? "house" : (stored as AttractionType);
}

export function toStoredCategory(category: AttractionType): string {
  return category === "house" ? "walkthrough" : category;
}

function mapRow(row: ExperienceTypeRow): ExperienceType {
  return {
    id: row.id,
    hauntId: row.haunt_id as HauntId,
    category: toCategory(row.category),
    labelOne: row.label_one,
    labelMany: row.label_many,
    description: row.description,
    sortOrder: row.sort_order,
    packId: row.pack_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface ExperienceTypeRepository {
  getAll(): Promise<ExperienceType[]>;
  getByHaunt(hauntId: HauntId): Promise<ExperienceType[]>;
  /** Writes a type a pack declares, creating it or correcting its wording. */
  save(input: ExperienceTypeInput): Promise<ExperienceType>;
}

/**
 * What each haunt calls its experiences.
 *
 * Read on every launch and handed to the interface through the haunt
 * registry, which is why no component has to know that HHN says "House"
 * and Knott's says "Maze".
 */
export function createExperienceTypeRepository(db: SqlExecutor): ExperienceTypeRepository {
  async function getAll(): Promise<ExperienceType[]> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<ExperienceTypeRow[]>(
        "SELECT * FROM experience_types ORDER BY haunt_id ASC, sort_order ASC",
      );
      return rows.map(mapRow);
    });
  }

  async function getByHaunt(hauntId: HauntId): Promise<ExperienceType[]> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<ExperienceTypeRow[]>(
        "SELECT * FROM experience_types WHERE haunt_id = ? ORDER BY sort_order ASC",
        [hauntId],
      );
      return rows.map(mapRow);
    });
  }

  async function save(input: ExperienceTypeInput): Promise<ExperienceType> {
    return withDatabaseErrors(async () => {
      await db.execute(
        `INSERT INTO experience_types (
           id, haunt_id, category, label_one, label_many, description, sort_order, pack_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
           haunt_id = excluded.haunt_id,
           category = excluded.category,
           label_one = excluded.label_one,
           label_many = excluded.label_many,
           description = excluded.description,
           sort_order = excluded.sort_order,
           pack_id = excluded.pack_id,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
        [
          input.id,
          input.hauntId,
          toStoredCategory(input.category),
          input.labelOne,
          input.labelMany,
          input.description ?? null,
          input.sortOrder ?? 100,
          input.packId ?? null,
        ],
      );

      const rows = await db.select<ExperienceTypeRow[]>(
        "SELECT * FROM experience_types WHERE id = ?",
        [input.id],
      );
      if (!rows[0]) {
        throw new Error(`Experience type "${input.id}" could not be saved.`);
      }
      return mapRow(rows[0]);
    });
  }

  return { getAll, getByHaunt, save };
}
