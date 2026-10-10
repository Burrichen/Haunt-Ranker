/**
 * Migration 0015_canonical_identity, done to a backup file instead.
 *
 * A restore replaces the archive wholesale, so a file written before 0015
 * could put back the duplicates that migration exists to remove: an HHN
 * attraction split into a record per park, or a Knott's maze split into a
 * record per season. This takes the migration's steps on the file's rows,
 * in the same order, so restoring an old backup lands where migrating the
 * database it came from would have. See the migration for the why of each.
 */

import { ZERO_WIDTH_PATTERN } from "../models/common";
import { byText, normalisedName, rowsOf } from "./hhnBackupUpgrades";

type Row = Record<string, unknown>;
type Data = Record<string, unknown>;

const MIGRATION_0015 = "0015_canonical_identity";

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

type Rule = "hhn" | "knotts";

interface Member {
  id: string;
  calendarYear: number;
  debutYear: unknown;
}

export function mergeCanonicalIdentity(
  data: Data,
  stamp: string,
  /** The migration this mirrors — 0015, or 0017 which re-applies the rule. */
  migration: string = MIGRATION_0015,
): Data {
  const number = migration.slice(0, 4);
  const seasons = new Map(rowsOf(data, "eventYears").map((row) => [String(row.id), row]));
  const attractions = rowsOf(data, "attractions");
  const rated = new Set(rowsOf(data, "ratings").map((row) => String(row.attraction_id)));
  const noted = new Set(rowsOf(data, "notes").map((row) => String(row.attraction_id)));
  const rankings = rowsOf(data, "rankings");

  // The groups: one HHN name in one season, or one Knott's name in any season.
  const groups = new Map<string, { rule: Rule; members: Member[] }>();
  for (const row of attractions) {
    const season = seasons.get(String(row.event_year_id));
    const haunt = String(season?.haunt_id ?? "hhn");
    if (row.attraction_type !== "house" || !season) {
      continue;
    }
    if (haunt !== "hhn" && haunt !== "knotts-scary-farm") {
      continue;
    }
    const rule: Rule = haunt === "hhn" ? "hhn" : "knotts";
    const key =
      (rule === "hhn" ? `hhn|${String(row.event_year_id)}|` : `${haunt}|`) +
      normalisedName(row.name);
    const group = groups.get(key) ?? { rule, members: [] };
    group.members.push({
      id: String(row.id),
      calendarYear: Number(season.calendar_year),
      debutYear: row.debut_year ?? null,
    });
    groups.set(key, group);
  }

  const conflicts: Row[] = [];
  const mergeInto = new Map<string, string>();
  const ruleOf = new Map<string, Rule>();
  for (const { rule, members } of groups.values()) {
    if (members.length < 2) {
      continue;
    }
    const ordered = [...members].sort(
      (a, b) => (rule === "knotts" ? a.calendarYear - b.calendarYear : 0) || byText(a.id, b.id),
    );
    const survivor = ordered[0].id;
    const ids = new Set(members.map((member) => member.id));
    const ratedRecords = members.filter((member) => rated.has(member.id)).length;
    const notedRecords = members.filter((member) => noted.has(member.id)).length;
    const perList = new Map<string, number>();
    for (const row of rankings) {
      if (ids.has(String(row.attraction_id))) {
        perList.set(String(row.scope), (perList.get(String(row.scope)) ?? 0) + 1);
      }
    }
    const clashingLists = [...perList.values()].filter((count) => count > 1).length;
    const knownDebuts = new Set(
      members.map((member) => member.debutYear).filter((year) => year !== null),
    ).size;
    const reusedTitle = rule === "knotts" && knownDebuts > 1;
    const blocked = reusedTitle || ratedRecords > 1 || notedRecords > 1 || clashingLists > 0;

    for (const { id } of ordered.slice(1)) {
      if (!blocked) {
        mergeInto.set(id, survivor);
        ruleOf.set(survivor, rule);
        continue;
      }
      conflicts.push({
        id: `conflict-${number}-${id}`,
        migration,
        kind: reusedTitle ? "name_reused_different_debut" : "canonical_personal_data",
        subject_id: id,
        other_id: survivor,
        detail: reusedTitle
          ? "Not merged: these records share a name but have different debut years, so they " +
            "may be different mazes. Both records were left exactly as they are."
          : "Not merged: this attraction and the record it would merge into both hold " +
            `personal data (ratings on ${ratedRecords} records, notes on ${notedRecords} ` +
            `records, ${clashingLists} ranking lists holding both). ` +
            "Both records were left exactly as they are.",
        resolved_at: null,
        created_at: stamp,
      });
    }
  }

  const out: Data = { ...data };
  const knownConflicts = new Set(rowsOf(data, "migrationConflicts").map((row) => String(row.id)));
  const newConflicts = (rows: Row[]) => rows.filter((row) => !knownConflicts.has(String(row.id)));
  if (mergeInto.size === 0) {
    out.migrationConflicts = [...rowsOf(data, "migrationConflicts"), ...newConflicts(conflicts)];
    return out;
  }

  const byId = new Map(attractions.map((row) => [String(row.id), row]));
  const map = (id: unknown) => mergeInto.get(String(id)) ?? String(id);
  const sortedMerges = [...mergeInto].sort(([a], [b]) => byText(a, b));
  const mergedFrom = new Map<string, string[]>();
  for (const [from, to] of sortedMerges) {
    mergedFrom.set(to, [...(mergedFrom.get(to) ?? []), from]);
  }
  const parksOf = new Map<string, string[]>();
  for (const row of rowsOf(data, "attractionParks")) {
    const id = String(row.attraction_id);
    parksOf.set(id, [...(parksOf.get(id) ?? []), String(row.park_id)]);
  }

  // HHN only: each park's prose as a venue section; existing sections win.
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
  for (const [from, to] of sortedMerges) {
    if (ruleOf.get(to) === "hhn") {
      for (const venue of parksOf.get(from) ?? []) {
        addSection(to, byId.get(from)!, venue);
      }
    }
  }
  for (const to of mergedFrom.keys()) {
    if (ruleOf.get(to) === "hhn") {
      for (const venue of parksOf.get(to) ?? []) {
        addSection(to, byId.get(to)!, venue);
      }
    }
  }
  out.attractionVenueWiki = venueWiki;

  out.attractions = attractions
    .filter((row) => !mergeInto.has(String(row.id)))
    .map((row) => {
      const from = mergedFrom.get(String(row.id));
      if (!from) {
        return row;
      }
      const filled: Row = { ...row, updated_at: stamp };
      for (const column of FILLED_FROM_MERGED) {
        filled[column] =
          row[column] ?? from.map((id) => byId.get(id)![column]).find((v) => v != null) ?? null;
      }
      if (ruleOf.get(String(row.id)) === "hhn") {
        filled.variant_name = null;
      }
      return filled;
    });

  /** Re-points rows at the survivor; where two now say the same thing, the survivor's own is kept. */
  const repoint = (key: string, identity: (row: Row) => string, extra: Row[] = []) => {
    const rows = rowsOf(data, key);
    const ordered = [
      ...rows.filter((row) => !mergeInto.has(String(row.attraction_id))),
      ...rows.filter((row) => mergeInto.has(String(row.attraction_id))),
      ...extra,
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
  repoint(
    "seasonAppearances",
    (row) => `${row.attraction_id}|${row.season_id}`,
    sortedMerges.map(([from, to]) => ({
      attraction_id: to,
      season_id: byId.get(from)!.event_year_id,
      notes: null,
      created_at: stamp,
    })),
  );
  repoint("attractionSources", (row) => `${row.attraction_id}|${row.source_id}`);
  repoint("characters", (row) => String(row.id));
  repoint("media", (row) => String(row.id));
  // Nothing personal can collide here — a clash stopped the merge — so these
  // only ever move, never drop.
  repoint("ratings", (row) => String(row.id));
  repoint("notes", (row) => String(row.id));
  repoint("rankings", (row) => String(row.id));

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
    ...rowsOf(data, "migrationConflicts"),
    ...newConflicts([
      ...conflicts,
      ...sortedMerges.map(([from, to]) => ({
        id: `merged-${number}-${from}`,
        migration,
        kind: ruleOf.get(to) === "hhn" ? "cross_park_merged" : "returning_maze_merged",
        subject_id: from,
        other_id: to,
        detail:
          ruleOf.get(to) === "hhn"
            ? "Merged into the canonical record: same name, same season, same haunt."
            : "Merged into the canonical record: the same maze returning in a later season.",
        resolved_at: stamp,
        created_at: stamp,
      })),
    ]),
  ];

  return out;
}

const MIGRATION_0017 = "0017_scrape_name_fixes";
const ZERO_WIDTH = new RegExp(ZERO_WIDTH_PATTERN, "g");
const HAS_ZERO_WIDTH = new RegExp(ZERO_WIDTH_PATTERN);

/**
 * Migration 0017_scrape_name_fixes, on backup rows: the names the original
 * HHN scrape broke are repaired — each only while it still holds the broken
 * value — and the canonical identity rule runs again, which merges Orlando's
 * and Hollywood's 2021 The Haunting of Hill House now that their names agree.
 */
export function repairScrapedNames(data: Data, stamp: string): Data {
  const attractions = rowsOf(data, "attractions").map((row) => {
    const name = String(row.name ?? "");
    const visible = name.replace(ZERO_WIDTH, "").trim();
    if (row.id === "hhn-2015-house-" && visible === "") {
      return { ...row, name: "Insidious", location_notes: "Sprung Tent 2", updated_at: stamp };
    }
    if (row.id === "hhn-2021-house-the-hau" && name === "The Hau") {
      return {
        ...row,
        name: "The Haunting of Hill House",
        location_notes: null,
        updated_at: stamp,
      };
    }
    if (visible !== "" && HAS_ZERO_WIDTH.test(name)) {
      return { ...row, name: visible, updated_at: stamp };
    }
    return row;
  });
  return mergeCanonicalIdentity({ ...data, attractions }, stamp, MIGRATION_0017);
}
