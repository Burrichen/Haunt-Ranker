/**
 * Migration 0014_walkthroughs_only, done to a backup file instead.
 *
 * A backup restore replaces the archive wholesale, so a file written while
 * Haunt Ranker still archived scare zones, shows and other experiences would
 * put them straight back. This takes the same steps the migration takes, on
 * the file's rows, so restoring an old backup lands exactly where migrating
 * the database it came from would have:
 *
 * 1. every rating, note and ranking position on a retired record is copied
 *    whole into `legacyPersonalData` — preserved, never shown;
 * 2. an "All Attractions" manual order is copied into the walk-through list
 *    where that list was never made;
 * 3. the retired records, everything that belongs to them, the sources only
 *    they cited, and their vocabulary are removed.
 */

type Row = Record<string, unknown>;
type Data = Record<string, unknown>;

function rowsOf(data: Data, key: string): Row[] {
  const value = data[key];
  return Array.isArray(value) ? (value as Row[]) : [];
}

function byText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** The only attraction category the archive holds. */
const WALKTHROUGH = "house";
/** The same category, as `experience_types` stores it. */
const WALKTHROUGH_CATEGORY = "walkthrough";
const LEGACY_REASON = "retired-category";

/** The columns of each personal row, in the order the migration's json_object writes them. */
const PAYLOAD_COLUMNS = {
  rating: ["id", "attraction_id", "theme", "fun", "fear", "created_at", "updated_at"],
  note: ["id", "attraction_id", "note", "created_at", "updated_at"],
  ranking: ["id", "scope", "attraction_id", "position", "created_at", "updated_at"],
} as const;

type LegacyKind = keyof typeof PAYLOAD_COLUMNS;

const PERSONAL_TABLES: Array<[LegacyKind, string]> = [
  ["rating", "ratings"],
  ["note", "notes"],
  ["ranking", "rankings"],
];

const ALL_ATTRACTIONS = "attractions:all";
const ALL_WALKTHROUGHS = "houses:all";

function payload(kind: LegacyKind, row: Row): string {
  const picked: Row = {};
  for (const column of PAYLOAD_COLUMNS[kind]) {
    picked[column] = row[column] ?? null;
  }
  return JSON.stringify(picked);
}

/** `attractions:all` → `houses:all`, `hhn:attractions:all` → `hhn:houses:all`; anything else → null. */
function walkthroughScopeFor(scope: string): string | null {
  if (scope === ALL_ATTRACTIONS || scope.endsWith(`:${ALL_ATTRACTIONS}`)) {
    return scope.slice(0, scope.length - ALL_ATTRACTIONS.length) + ALL_WALKTHROUGHS;
  }
  return null;
}

/**
 * Takes the given attractions out of a backup's archive the way a migration
 * would: every rating, note and ranking position on them is copied whole into
 * `legacyPersonalData` first, then they go with everything that belongs to
 * them and any source only they cited.
 */
export function retireAttractions(
  data: Data,
  ids: ReadonlySet<string>,
  reason: string,
  preservedAt: string,
): Data {
  const retired = new Map(
    rowsOf(data, "attractions")
      .filter((row) => ids.has(String(row.id)))
      .map((row) => [String(row.id), row]),
  );
  if (retired.size === 0) {
    return data;
  }
  const seasons = new Map(rowsOf(data, "eventYears").map((row) => [String(row.id), row]));
  const isRetired = (value: unknown) => retired.has(String(value));

  // 1. Preserve.
  const legacy: Row[] = [...rowsOf(data, "legacyPersonalData")];
  for (const [kind, key] of PERSONAL_TABLES) {
    for (const row of rowsOf(data, key)) {
      const attraction = retired.get(String(row.attraction_id));
      if (!attraction) {
        continue;
      }
      const season = seasons.get(String(attraction.event_year_id));
      legacy.push({
        id: `${kind}:${String(row.id)}`,
        kind,
        original_id: row.id,
        attraction_id: attraction.id,
        attraction_name: attraction.name ?? null,
        attraction_type: attraction.attraction_type ?? null,
        haunt_id: season?.haunt_id ?? null,
        season_id: season?.id ?? null,
        calendar_year: season?.calendar_year ?? null,
        payload: payload(kind, row),
        reason,
        preserved_at: preservedAt,
      });
    }
  }

  // 2. Remove.
  const attractionSources = rowsOf(data, "attractionSources");
  const candidateSources = new Set(
    attractionSources
      .filter((row) => isRetired(row.attraction_id))
      .map((row) => String(row.source_id)),
  );
  const keptAttractionSources = attractionSources.filter((row) => !isRetired(row.attraction_id));
  const keptMedia = rowsOf(data, "media").filter((row) => !isRetired(row.attraction_id));
  const stillCited = new Set([
    ...keptAttractionSources.map((row) => String(row.source_id)),
    ...rowsOf(data, "eventYearSources").map((row) => String(row.source_id)),
    ...keptMedia.filter((row) => row.source_id != null).map((row) => String(row.source_id)),
  ]);

  const withoutRetired = (key: string) =>
    rowsOf(data, key).filter((row) => !isRetired(row.attraction_id));

  return {
    ...data,
    attractions: rowsOf(data, "attractions").filter((row) => !isRetired(row.id)),
    attractionParks: withoutRetired("attractionParks"),
    seasonAppearances: withoutRetired("seasonAppearances"),
    characters: withoutRetired("characters"),
    attractionRelations: rowsOf(data, "attractionRelations").filter(
      (row) => !isRetired(row.attraction_id) && !isRetired(row.related_attraction_id),
    ),
    sources: rowsOf(data, "sources").filter(
      (row) => !candidateSources.has(String(row.id)) || stillCited.has(String(row.id)),
    ),
    attractionSources: keptAttractionSources,
    media: keptMedia,
    attractionVenueWiki: withoutRetired("attractionVenueWiki"),
    ratings: withoutRetired("ratings"),
    notes: withoutRetired("notes"),
    rankings: withoutRetired("rankings"),
    legacyPersonalData: legacy,
  };
}

export function retireNonWalkthroughs(data: Data, preservedAt: string): Data {
  const attractions = rowsOf(data, "attractions");
  const retired = new Set(
    attractions.filter((row) => row.attraction_type !== WALKTHROUGH).map((row) => String(row.id)),
  );

  // Keep a hand-made All Attractions order as the walk-through list.
  const walkthroughIds = new Set(
    attractions.filter((row) => !retired.has(String(row.id))).map((row) => String(row.id)),
  );
  const rankings = rowsOf(data, "rankings");
  const scopes = new Set(rankings.map((row) => String(row.scope)));
  const copies: Row[] = [];
  for (const scope of [...scopes].sort(byText)) {
    const target = walkthroughScopeFor(scope);
    if (target === null || scopes.has(target)) {
      continue;
    }
    rankings
      .filter((row) => row.scope === scope && walkthroughIds.has(String(row.attraction_id)))
      .sort((a, b) => Number(a.position) - Number(b.position) || byText(String(a.id), String(b.id)))
      .forEach((row, position) =>
        copies.push({ ...row, id: `walkthrough:${String(row.id)}`, scope: target, position }),
      );
  }

  const withCopies = { ...data, rankings: [...rankings, ...copies] };
  const out = retireAttractions(withCopies, retired, LEGACY_REASON, preservedAt);
  return {
    ...out,
    // A file with nothing to retire still loses the retired vocabulary.
    legacyPersonalData: rowsOf(out, "legacyPersonalData"),
    experienceTypes: rowsOf(data, "experienceTypes").filter(
      (row) => row.category === WALKTHROUGH_CATEGORY,
    ),
  };
}
