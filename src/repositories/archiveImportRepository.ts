import { ATTRACTION_OWNED_TABLES, EVENT_YEAR_OWNED_TABLES } from "../archive/archiveTables";
import { pairKey, type ArchiveOperation, type ArchiveState } from "../archive/importOperations";
import { BACKUP_TABLES, columnNames } from "../backup/backupTables";
import { withDatabaseErrors } from "../database/errors";
import type { SqlExecutor } from "../database/types";

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

function columnsOf(key: string): string[] {
  const spec = BACKUP_TABLES.find((table) => table.key === key);
  if (!spec) {
    throw new Error(`No table spec for ${key}`);
  }
  return columnNames(spec);
}

export interface ArchiveImportRepository {
  /** Everything an import compares against, read in one pass. */
  readState(): Promise<ArchiveState>;
  /**
   * Runs the planned writes, undoing all of them if any one fails.
   *
   * Personal tables are never written here. The single exception is `rename`,
   * which moves a rating, a note or a ranking position to a new attraction id
   * — the mechanism that keeps them attached when the archive corrects an
   * identity, rather than the thing that loses them.
   */
  execute(operations: ArchiveOperation[]): Promise<void>;
}

export function createArchiveImportRepository(db: SqlExecutor): ArchiveImportRepository {
  async function mapOf(key: string, table: string): Promise<Map<string, Record<string, unknown>>> {
    const rows = await db.select<Array<Record<string, unknown>>>(
      `SELECT ${columnsOf(key).join(", ")} FROM ${table}`,
    );
    return new Map(rows.map((row) => [row.id as string, row]));
  }

  async function setOf(table: string, first: string, second: string): Promise<Set<string>> {
    const rows = await db.select<Array<Record<string, string>>>(
      `SELECT ${first}, ${second} FROM ${table}`,
    );
    return new Set(rows.map((row) => pairKey(row[first], row[second])));
  }

  /** Venue-specific wiki sections, keyed `attraction id|venue id`. */
  async function venueWikiRows(): Promise<Map<string, Record<string, unknown>>> {
    const columns = columnsOf("attractionVenueWiki");
    const rows = await db.select<Array<Record<string, unknown>>>(
      `SELECT ${columns.join(", ")} FROM attraction_venue_wiki`,
    );
    return new Map(
      rows.map((row) => [pairKey(row.attraction_id as string, row.venue_id as string), row]),
    );
  }

  async function readState(): Promise<ArchiveState> {
    return withDatabaseErrors(async () => {
      // Only how many, never what they say: the importer has no reason to
      // read a rating or a note, so it doesn't.
      const personal = await db.select<Array<{ attraction_id: string; count: number }>>(
        `SELECT attraction_id, COUNT(*) as count FROM (
           SELECT attraction_id FROM user_ratings
           UNION ALL SELECT attraction_id FROM user_notes
           UNION ALL SELECT attraction_id FROM user_rankings
         ) GROUP BY attraction_id`,
      );

      return {
        eventYears: await mapOf("eventYears", "event_years"),
        attractions: await mapOf("attractions", "attractions"),
        characters: await mapOf("characters", "characters"),
        relations: await mapOf("attractionRelations", "attraction_relations"),
        sources: await mapOf("sources", "sources"),
        media: await mapOf("media", "media"),
        attractionParks: await setOf("attraction_parks", "attraction_id", "park_id"),
        venueWiki: await venueWikiRows(),
        seasonAppearances: await setOf("season_appearances", "attraction_id", "season_id"),
        attractionSources: await setOf("attraction_sources", "attraction_id", "source_id"),
        eventYearSources: await setOf("event_year_sources", "event_year_id", "source_id"),
        personalRowCounts: new Map(personal.map((row) => [row.attraction_id, row.count])),
      };
    });
  }

  async function insertRow(table: string, row: Record<string, unknown>): Promise<void> {
    const columns = Object.keys(row);
    await db.execute(
      `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
      columns.map((column) => row[column] ?? null),
    );
  }

  async function updateRow(
    table: string,
    id: string,
    values: Record<string, unknown>,
    updatedAt?: string,
  ): Promise<void> {
    const columns = Object.keys(values);
    const assignments = columns.map((column) => `${column} = ?`).join(", ");
    const stamp = updatedAt === undefined ? NOW : "?";
    await db.execute(`UPDATE ${table} SET ${assignments}, updated_at = ${stamp} WHERE id = ?`, [
      ...columns.map((column) => values[column] ?? null),
      ...(updatedAt === undefined ? [] : [updatedAt]),
      id,
    ]);
  }

  async function readUpdatedAt(table: string, id: string): Promise<string | undefined> {
    const rows = await db.select<Array<{ updated_at: string }>>(
      `SELECT updated_at FROM ${table} WHERE id = ?`,
      [id],
    );
    return rows[0]?.updated_at;
  }

  async function deleteLink(table: string, key: Record<string, string | null>): Promise<void> {
    // A row whose prose columns are null still has to be matched, and
    // `= NULL` never matches anything.
    const columns = Object.keys(key);
    const where = columns
      .map((column) => (key[column] === null ? `${column} IS NULL` : `${column} = ?`))
      .join(" AND ");
    await db.execute(
      `DELETE FROM ${table} WHERE ${where}`,
      columns.filter((column) => key[column] !== null).map((column) => key[column]),
    );
  }

  /**
   * Moves a record to a new id, taking everything that points at it — the
   * user's rating, note and ranking position included, which is the entire
   * reason `previousIds` exists.
   *
   * The copy goes in before the original comes out, so nothing is ever left
   * dangling and no foreign key breaks, even for an instant. Both rows exist
   * for those few statements, so the copy takes a temporary value for whatever
   * the table holds unique — an attraction's slug, an event's name — and gets
   * the real one back once the original is gone.
   */
  async function rename(
    entity: "attraction" | "eventYear",
    from: string,
    to: string,
  ): Promise<void> {
    const isAttraction = entity === "attraction";
    const table = isAttraction ? "attractions" : "event_years";
    const columns = columnsOf(isAttraction ? "attractions" : "eventYears");

    const rows = await db.select<Array<Record<string, unknown>>>(
      `SELECT ${columns.join(", ")} FROM ${table} WHERE id = ?`,
      [from],
    );
    const original = rows[0];
    if (!original) {
      throw new Error(`Cannot rename "${from}": it is no longer in the archive.`);
    }

    const uniqueColumn = isAttraction ? "slug" : "name";
    const finalValue = original[uniqueColumn];
    const temporaryValue = isAttraction ? to : `${String(original.name)} (${to})`;

    await insertRow(table, { ...original, id: to, [uniqueColumn]: temporaryValue });

    if (isAttraction) {
      for (const owned of ATTRACTION_OWNED_TABLES) {
        await db.execute(`UPDATE ${owned} SET attraction_id = ? WHERE attraction_id = ?`, [
          to,
          from,
        ]);
      }
      await db.execute(
        "UPDATE attraction_relations SET related_attraction_id = ? WHERE related_attraction_id = ?",
        [to, from],
      );
    } else {
      for (const owned of EVENT_YEAR_OWNED_TABLES) {
        await db.execute(`UPDATE ${owned} SET event_year_id = ? WHERE event_year_id = ?`, [
          to,
          from,
        ]);
      }
      // Appearances name the season in a column of their own.
      await db.execute("UPDATE season_appearances SET season_id = ? WHERE season_id = ?", [
        to,
        from,
      ]);
    }

    await db.execute(`DELETE FROM ${table} WHERE id = ?`, [from]);

    if (finalValue !== temporaryValue) {
      await db.execute(`UPDATE ${table} SET ${uniqueColumn} = ? WHERE id = ?`, [finalValue, to]);
    }
  }

  async function execute(operations: ArchiveOperation[]): Promise<void> {
    // How to put the archive back, newest first.
    //
    // There is deliberately no SQL transaction around this: the Tauri SQL
    // plugin runs a connection pool, so BEGIN and COMMIT issued as separate
    // calls are not guaranteed to reach the same connection. An explicit undo
    // log is honest about what it does — and, unlike restoring whole tables,
    // it never deletes an attraction and so can never cascade into someone's
    // rating.
    const undo: Array<() => Promise<void>> = [];

    try {
      for (const operation of operations) {
        switch (operation.kind) {
          case "insert": {
            await insertRow(operation.table, operation.row);
            undo.push(async () => {
              await db.execute(`DELETE FROM ${operation.table} WHERE id = ?`, [operation.id]);
            });
            break;
          }
          case "update": {
            const previousStamp = await readUpdatedAt(operation.table, operation.id);
            await updateRow(operation.table, operation.id, operation.changes);
            undo.push(() =>
              updateRow(operation.table, operation.id, operation.previous, previousStamp),
            );
            break;
          }
          case "link": {
            await insertRow(operation.table, operation.key);
            undo.push(() => deleteLink(operation.table, operation.key));
            break;
          }
          case "unlink": {
            await deleteLink(operation.table, operation.key);
            undo.push(() => insertRow(operation.table, operation.key));
            break;
          }
          case "rename": {
            await rename(operation.entity, operation.from, operation.to);
            undo.push(() => rename(operation.entity, operation.to, operation.from));
            break;
          }
        }
      }
    } catch (caught) {
      for (const step of undo.reverse()) {
        try {
          await step();
        } catch {
          // Keep unwinding: one step that can't be undone shouldn't strand
          // the rest of them.
        }
      }
      throw caught;
    }
  }

  return { readState, execute };
}
