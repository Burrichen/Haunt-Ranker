import { withDatabaseErrors } from "../database/errors";
import type { SqlExecutor } from "../database/types";
import type { EntityId } from "../models/common";
import type { RankingEntry } from "../models/ranking";
import { generateId } from "./id";

interface RankingRow {
  id: string;
  scope: string;
  attraction_id: string;
  position: number;
  created_at: string;
  updated_at: string;
}

function mapRow(row: RankingRow): RankingEntry {
  return {
    id: row.id,
    scope: row.scope,
    attractionId: row.attraction_id,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface RankingRepository {
  /** Ordered by position ascending — this ordering always takes precedence over any calculated score. */
  getScope(scope: string): Promise<RankingEntry[]>;
  /** Replaces the entire manual order for `scope` with dense positions matching array order. */
  setScope(scope: string, orderedAttractionIds: EntityId[]): Promise<RankingEntry[]>;
  getPosition(scope: string, attractionId: EntityId): Promise<number | null>;
  clearScope(scope: string): Promise<void>;
}

export function createRankingRepository(db: SqlExecutor): RankingRepository {
  async function getScope(scope: string): Promise<RankingEntry[]> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<RankingRow[]>(
        "SELECT * FROM user_rankings WHERE scope = ? ORDER BY position ASC",
        [scope],
      );
      return rows.map(mapRow);
    });
  }

  async function setScope(
    scope: string,
    orderedAttractionIds: EntityId[],
  ): Promise<RankingEntry[]> {
    return withDatabaseErrors(async () => {
      await db.execute("DELETE FROM user_rankings WHERE scope = ?", [scope]);

      if (orderedAttractionIds.length > 0) {
        const valuesSql = orderedAttractionIds.map(() => "(?, ?, ?, ?)").join(", ");
        const params = orderedAttractionIds.flatMap((attractionId, index) => [
          generateId(),
          scope,
          attractionId,
          index,
        ]);
        await db.execute(
          `INSERT INTO user_rankings (id, scope, attraction_id, position) VALUES ${valuesSql}`,
          params,
        );
      }

      const rows = await db.select<RankingRow[]>(
        "SELECT * FROM user_rankings WHERE scope = ? ORDER BY position ASC",
        [scope],
      );
      return rows.map(mapRow);
    });
  }

  async function getPosition(scope: string, attractionId: EntityId): Promise<number | null> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<Array<{ position: number }>>(
        "SELECT position FROM user_rankings WHERE scope = ? AND attraction_id = ?",
        [scope, attractionId],
      );
      return rows[0]?.position ?? null;
    });
  }

  async function clearScope(scope: string): Promise<void> {
    await withDatabaseErrors(() =>
      db.execute("DELETE FROM user_rankings WHERE scope = ?", [scope]),
    );
  }

  return { getScope, setScope, getPosition, clearScope };
}
