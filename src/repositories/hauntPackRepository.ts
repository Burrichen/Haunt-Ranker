import { withDatabaseErrors } from "../database/errors";
import type { SqlExecutor } from "../database/types";
import type { PackImportRecord, PackState } from "../packs/packState";

interface PackRow {
  id: string;
  pack_id: string;
  pack_version: string;
  schema_id: string;
  haunt_id: string;
  haunt_name: string;
  generated_at: string | null;
  imported_at: string;
  summary: string;
  provenance_notes: string | null;
}

function mapRow(row: PackRow): PackImportRecord {
  return {
    id: row.id,
    packId: row.pack_id,
    packVersion: row.pack_version,
    schemaId: row.schema_id,
    hauntId: row.haunt_id,
    hauntName: row.haunt_name,
    generatedAt: row.generated_at,
    importedAt: row.imported_at,
    summary: row.summary,
    provenanceNotes: row.provenance_notes,
  };
}

export interface HauntPackRepository {
  /** Everything a pack import compares itself against, read in one pass. */
  readState(): Promise<PackState>;
  /** Every pack import this installation has done, newest first. */
  listImports(): Promise<PackImportRecord[]>;
  /** Records one import, so the archive can say where a record came from. */
  recordImport(entry: Omit<PackImportRecord, "importedAt">): Promise<void>;
}

/**
 * What the archive already holds, from a Haunt Pack's point of view.
 *
 * Deliberately reads the provenance columns — which pack last wrote a
 * record, and when someone last edited it by hand — because those two dates
 * are what decide whether an incoming pack may change a field or has to
 * report a conflict instead.
 *
 * It never reads a rating, a note or a ranking. A pack has no way to
 * describe one, so the planner has no reason to look.
 */
export function createHauntPackRepository(db: SqlExecutor): HauntPackRepository {
  async function rowsOf(sql: string): Promise<Array<Record<string, unknown>>> {
    return db.select<Array<Record<string, unknown>>>(sql);
  }

  async function keyed(sql: string): Promise<Map<string, Record<string, unknown>>> {
    const rows = await rowsOf(sql);
    return new Map(rows.map((row) => [row.id as string, row]));
  }

  async function pairs(table: string, first: string, second: string): Promise<Set<string>> {
    const rows = await db.select<Array<Record<string, string>>>(
      `SELECT ${first}, ${second} FROM ${table}`,
    );
    return new Set(rows.map((row) => `${row[first]}|${row[second]}`));
  }

  async function readState(): Promise<PackState> {
    return withDatabaseErrors(async () => ({
      haunts: await keyed("SELECT * FROM haunts"),
      experienceTypes: await keyed("SELECT * FROM experience_types"),
      venues: await keyed("SELECT * FROM parks"),
      seasons: await keyed("SELECT * FROM event_years"),
      attractions: await keyed("SELECT * FROM attractions"),
      characters: await keyed("SELECT * FROM characters"),
      sources: await keyed("SELECT * FROM sources"),
      media: await keyed("SELECT * FROM media"),
      relations: new Map(
        (await rowsOf("SELECT * FROM attraction_relations")).map((row) => [
          `${row.attraction_id as string}|${row.related_attraction_id as string}|${row.relation_type as string}`,
          row,
        ]),
      ),
      venueWiki: new Map(
        (await rowsOf("SELECT * FROM attraction_venue_wiki")).map((row) => [
          `${row.attraction_id as string}|${row.venue_id as string}`,
          row,
        ]),
      ),
      attractionVenues: await pairs("attraction_parks", "attraction_id", "park_id"),
      appearances: await pairs("season_appearances", "attraction_id", "season_id"),
      attractionSources: await pairs("attraction_sources", "attraction_id", "source_id"),
      seasonSources: await pairs("event_year_sources", "event_year_id", "source_id"),
    }));
  }

  async function listImports(): Promise<PackImportRecord[]> {
    return withDatabaseErrors(async () => {
      const rows = await db.select<PackRow[]>(
        "SELECT * FROM haunt_packs ORDER BY imported_at DESC, id DESC",
      );
      return rows.map(mapRow);
    });
  }

  async function recordImport(entry: Omit<PackImportRecord, "importedAt">): Promise<void> {
    await withDatabaseErrors(() =>
      db.execute(
        `INSERT INTO haunt_packs (
           id, pack_id, pack_version, schema_id, haunt_id, haunt_name,
           generated_at, summary, provenance_notes
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          entry.id,
          entry.packId,
          entry.packVersion,
          entry.schemaId,
          entry.hauntId,
          entry.hauntName,
          entry.generatedAt,
          entry.summary,
          entry.provenanceNotes,
        ],
      ),
    );
  }

  return { readState, listImports, recordImport };
}
