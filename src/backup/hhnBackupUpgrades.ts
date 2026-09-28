/**
 * What the HHN migrations do to a database, done to a backup file instead.
 *
 * A backup restore replaces the archive wholesale, so a file written before
 * a migration never passes through that migration: restoring it would put
 * back exactly the state the migration existed to change. Each function
 * here is the row-for-row equivalent of one migration, applied while the
 * file is upgraded, so restoring an old backup lands on the same HHN as
 * migrating the database it came from. hhnMigrationRegression.test.ts holds
 * the two to that, against the real archive.
 */

type Row = Record<string, unknown>;
type Data = Record<string, unknown>;

function rowsOf(data: Data, key: string): Row[] {
  const value = data[key];
  return Array.isArray(value) ? (value as Row[]) : [];
}

const MIGRATION_0009 = "0009_merge_hhn_cross_park";

/** Prose a merge carries from the record going away into the canonical one. */
const FILLED_FROM_MERGED = [
  "short_summary",
  "full_overview",
  "story_lore",
  "experience_description",
  "development_notes",
  "ip_type",
  "franchise_name",
  "debut_year",
] as const;

const VENUE_PROSE = [
  ["full_overview", "overview"],
  ["story_lore", "story_lore"],
  ["experience_description", "experience_description"],
  ["development_notes", "development_notes"],
  ["location_notes", "location_notes"],
] as const;

/**
 * 0009's name matching, exactly: runs of spaces collapsed (its three
 * `REPLACE` passes), spaces trimmed, ASCII lowercased. SQLite's `LOWER` and
 * `TRIM` do no more than that, so neither does this.
 */
function normalisedName(name: unknown): string {
  let value = String(name);
  for (let pass = 0; pass < 3; pass += 1) {
    value = value.replaceAll("  ", " ");
  }
  return value.replace(/^ +| +$/g, "").replace(/[A-Z]/g, (letter) => letter.toLowerCase());
}

function byText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * 0009_merge_hhn_cross_park, on backup rows.
 *
 * The same attraction name in the same HHN season, of the same type, at
 * both parks becomes one canonical record — the lowest id — carrying both
 * venues. Where both halves hold a rating, or both hold a note, nothing is
 * merged and the clash is recorded instead. See the migration for the why
 * of every step; this follows it in the same order.
 */
export function mergeCrossParkHhn(data: Data, stamp: string): Data {
  const out: Data = { ...data };
  const hhnSeasons = new Set(
    rowsOf(data, "eventYears")
      .filter((row) => (row.haunt_id ?? "hhn") === "hhn")
      .map((row) => String(row.id)),
  );
  const attractions = rowsOf(data, "attractions");
  const ratedCount = new Map<string, number>();
  for (const row of rowsOf(data, "ratings")) {
    const id = String(row.attraction_id);
    ratedCount.set(id, (ratedCount.get(id) ?? 0) + 1);
  }
  const notedCount = new Map<string, number>();
  for (const row of rowsOf(data, "notes")) {
    const id = String(row.attraction_id);
    notedCount.set(id, (notedCount.get(id) ?? 0) + 1);
  }

  const groups = new Map<string, string[]>();
  for (const row of attractions) {
    if (!hhnSeasons.has(String(row.event_year_id))) {
      continue;
    }
    const key = `${String(row.event_year_id)}\u0000${String(row.attraction_type)}\u0000${normalisedName(row.name)}`;
    const members = groups.get(key) ?? [];
    members.push(String(row.id));
    groups.set(key, members);
  }

  const conflicts: Row[] = [];
  const mergeInto = new Map<string, string>();
  for (const members of groups.values()) {
    if (members.length < 2) {
      continue;
    }
    const sorted = [...members].sort(byText);
    const survivor = sorted[0];
    const rated = sorted.filter((id) => (ratedCount.get(id) ?? 0) > 0).length;
    const noted = sorted.filter((id) => (notedCount.get(id) ?? 0) > 0).length;

    for (const id of sorted.slice(1)) {
      if (rated > 1 || noted > 1) {
        conflicts.push({
          id: `conflict-0009-${id}`,
          migration: MIGRATION_0009,
          kind: "cross_park_personal_data",
          subject_id: id,
          other_id: survivor,
          detail:
            "Not merged: this attraction and the record it would merge into both hold " +
            `personal data (ratings on ${rated} records, notes on ${noted} records). ` +
            "Both records were left exactly as they are.",
          resolved_at: null,
          created_at: stamp,
        });
      } else {
        mergeInto.set(id, survivor);
      }
    }
  }

  const existingConflicts = rowsOf(data, "migrationConflicts");
  if (mergeInto.size === 0) {
    out.migrationConflicts = [...existingConflicts, ...conflicts];
    return out;
  }

  const byId = new Map(attractions.map((row) => [String(row.id), row]));
  const map = (id: unknown) => mergeInto.get(String(id)) ?? String(id);
  const parksOf = new Map<string, string[]>();
  for (const row of rowsOf(data, "attractionParks")) {
    const id = String(row.attraction_id);
    parksOf.set(id, [...(parksOf.get(id) ?? []), String(row.park_id)]);
  }
  const mergedFrom = new Map<string, string[]>();
  for (const [from, to] of [...mergeInto].sort(([a], [b]) => byText(a, b))) {
    mergedFrom.set(to, [...(mergedFrom.get(to) ?? []), from]);
  }

  // What the disappearing record knew, as venue sections — first its own,
  // then the survivor's. Neither overwrites a section already there.
  const venueWiki = [...rowsOf(data, "attractionVenueWiki")];
  const sectionKeys = new Set(venueWiki.map((row) => `${row.attraction_id}|${row.venue_id}`));
  const addSection = (owner: string, source: Row, venue: string) => {
    const key = `${owner}|${venue}`;
    if (sectionKeys.has(key) || VENUE_PROSE.every(([column]) => source[column] == null)) {
      return;
    }
    sectionKeys.add(key);
    const section: Row = { attraction_id: owner, venue_id: venue };
    for (const [column, target] of VENUE_PROSE) {
      section[target] = source[column] ?? null;
    }
    venueWiki.push({ ...section, created_at: stamp, updated_at: stamp });
  };
  for (const [from, to] of mergeInto) {
    for (const venue of parksOf.get(from) ?? []) {
      addSection(to, byId.get(from)!, venue);
    }
  }
  for (const to of mergedFrom.keys()) {
    for (const venue of parksOf.get(to) ?? []) {
      addSection(to, byId.get(to)!, venue);
    }
  }
  out.attractionVenueWiki = venueWiki;

  // The canonical record: the fuller of the two, and no longer one park's
  // version of anything.
  out.attractions = attractions
    .filter((row) => !mergeInto.has(String(row.id)))
    .map((row) => {
      const from = mergedFrom.get(String(row.id));
      if (!from) {
        return row;
      }
      const first = byId.get(from[0])!;
      const filled: Row = { ...row, variant_name: null, updated_at: stamp };
      for (const column of FILLED_FROM_MERGED) {
        filled[column] = row[column] ?? first[column] ?? null;
      }
      return filled;
    });

  /**
   * Re-points rows at the survivor. Where two rows now say the same thing,
   * the survivor's own is kept — as 0009's `INSERT OR IGNORE` keeps it — so
   * its rows are taken first. A row with no attraction (a season's media)
   * is left as it is.
   */
  const repoint = (key: string, identity: (row: Row) => string) => {
    const rows = rowsOf(data, key);
    const ordered = [
      ...rows.filter((row) => !mergeInto.has(String(row.attraction_id))),
      ...rows.filter((row) => mergeInto.has(String(row.attraction_id))),
    ];
    const seen = new Set<string>();
    out[key] = ordered
      .map((row) =>
        row.attraction_id == null ? row : { ...row, attraction_id: map(row.attraction_id) },
      )
      .filter((row) => {
        const id = identity(row);
        if (seen.has(id)) {
          return false;
        }
        seen.add(id);
        return true;
      });
  };
  repoint("attractionParks", (row) => `${row.attraction_id}|${row.park_id}`);
  repoint("seasonAppearances", (row) => `${row.attraction_id}|${row.season_id}`);
  repoint("attractionSources", (row) => `${row.attraction_id}|${row.source_id}`);
  repoint("characters", (row) => String(row.id));
  repoint("media", (row) => String(row.id));
  repoint("ratings", (row) => String(row.id));
  repoint("notes", (row) => String(row.id));

  // A ranking position could collide inside one scope, so the survivor's
  // own position wins and the duplicate is dropped.
  const ranked = new Set(
    rowsOf(data, "rankings").map((row) => `${row.scope}|${row.attraction_id}`),
  );
  out.rankings = rowsOf(data, "rankings")
    .filter((row) => {
      const to = mergeInto.get(String(row.attraction_id));
      return to === undefined || !ranked.has(`${row.scope}|${to}`);
    })
    .map((row) => ({ ...row, attraction_id: map(row.attraction_id) }));

  // Relations follow, minus any that would now point a record at itself.
  const relationKeys = new Set<string>();
  out.attractionRelations = rowsOf(data, "attractionRelations")
    .map((row): Row => ({
      ...row,
      attraction_id: map(row.attraction_id),
      related_attraction_id: map(row.related_attraction_id),
    }))
    .filter((row) => {
      const key = `${row.attraction_id}|${row.related_attraction_id}|${row.relation_type}`;
      if (row.attraction_id === row.related_attraction_id || relationKeys.has(key)) {
        return false;
      }
      relationKeys.add(key);
      return true;
    });

  out.migrationConflicts = [
    ...existingConflicts,
    ...conflicts,
    ...[...mergeInto].map(([from, to]) => ({
      id: `merged-0009-${from}`,
      migration: MIGRATION_0009,
      kind: "cross_park_merged",
      subject_id: from,
      other_id: to,
      detail: "Merged into the canonical record: same name, same season, same haunt, other park.",
      resolved_at: stamp,
      created_at: stamp,
    })),
  ];

  return out;
}

/** The lists every ranking was saved under before there was a second haunt. */
const PRE_MULTI_HAUNT_SCOPES = ["houses:all", "scare_zones:all", "attractions:all"];

/**
 * 0012_hhn_ranking_scopes, on backup rows: where HHN has no list of its own,
 * it gets a copy of the unprefixed one, HHN attractions only, in the same
 * order, with dense positions. The unprefixed list stays as All Haunts'.
 */
export function copyHhnRankingScopes(data: Data): Data {
  const hhnSeasons = new Set(
    rowsOf(data, "eventYears")
      .filter((row) => (row.haunt_id ?? "hhn") === "hhn")
      .map((row) => String(row.id)),
  );
  const hhnAttractions = new Set(
    rowsOf(data, "attractions")
      .filter((row) => hhnSeasons.has(String(row.event_year_id)))
      .map((row) => String(row.id)),
  );
  const rankings = rowsOf(data, "rankings");
  const scopes = new Set(rankings.map((row) => String(row.scope)));

  const copies: Row[] = [];
  for (const scope of PRE_MULTI_HAUNT_SCOPES) {
    if (scopes.has(`hhn:${scope}`)) {
      continue;
    }
    rankings
      .filter((row) => row.scope === scope && hhnAttractions.has(String(row.attraction_id)))
      .sort((a, b) => Number(a.position) - Number(b.position) || byText(String(a.id), String(b.id)))
      .forEach((row, position) =>
        copies.push({ ...row, id: `hhn:${String(row.id)}`, scope: `hhn:${scope}`, position }),
      );
  }

  return copies.length === 0 ? data : { ...data, rankings: [...rankings, ...copies] };
}
