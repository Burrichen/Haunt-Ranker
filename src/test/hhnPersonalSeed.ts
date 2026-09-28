import type { SqlExecutor } from "../database/types";

/**
 * Somebody's reviews, notes and rankings, written into a pre-multi-haunt
 * (schema 7) HHN archive so the migrations have real personal data to carry.
 *
 * Deterministic — driven by sorted ids, never by randomness or the clock —
 * so the recorded personal data is the same on every run. Plain SQL only,
 * because it runs against the old build's schema.
 *
 * It deliberately covers each case 0009's cross-park merge has to decide:
 * the rating on the record that goes away, the rating on the survivor, a
 * rating on both (a conflict, left alone), a note on one and a rating on the
 * other, a note on both (a conflict), and both halves placed in a ranking.
 */

interface Row {
  id: string;
  event_year_id: string;
  attraction_type: string;
  name: string;
}

/** 0009's own matching: trimmed, lowercased, runs of spaces collapsed. */
function normalise(name: string): string {
  return name.replace(/ {2,}/g, " ").trim().toLowerCase();
}

/** Split Orlando/Hollywood pairs, as 0009 will find them. Survivor first. */
export function splitGroups(rows: Row[]): string[][] {
  const groups = new Map<string, string[]>();
  for (const row of rows) {
    const key = `${row.event_year_id}|${row.attraction_type}|${normalise(row.name)}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(row.id);
  }
  return [...groups.values()]
    .filter((members) => members.length > 1)
    .map((members) => [...members].sort())
    .sort((a, b) => a[0].localeCompare(b[0]));
}

/** A valid 0–5 half-step value, spread across the range. */
function score(seed: number): number {
  return (seed % 11) / 2;
}

export async function seedPersonalData(db: SqlExecutor): Promise<void> {
  const rows = await db.select<Row[]>(
    "SELECT id, event_year_id, attraction_type, name FROM attractions ORDER BY id",
  );
  const groups = splitGroups(rows);
  if (groups.length < 7) {
    throw new Error(`Expected split pairs to seed against, found ${groups.length}.`);
  }

  const rated = new Map<string, [number, number, number]>();
  const noted = new Map<string, string>();
  const rate = (id: string, seed: number) =>
    rated.set(id, [score(seed * 3 + 1), score(seed * 5 + 2), score(seed * 7 + 3)]);

  // --- the cross-park cases ---------------------------------------------
  const [survivor0, away0] = groups[0];
  rate(away0, 101); // rating on the record that goes away → moves to the survivor
  const [survivor1] = groups[1];
  rate(survivor1, 102); // rating already on the survivor
  const [survivor2, away2] = groups[2];
  rate(survivor2, 103); // both rated → conflict, both kept
  rate(away2, 104);
  const [survivor3, away3] = groups[3];
  rate(survivor3, 105); // rating on one, note on the other → merged, both kept
  noted.set(away3, "Went twice; the Orlando build was the better one.");
  const [survivor4, away4] = groups[4];
  noted.set(survivor4, "Mine, on the Hollywood record."); // both noted → conflict
  noted.set(away4, "Mine, on the Orlando record.");
  const [survivor5, away5] = groups[5];
  rate(away5, 106); // both halves ranked; the rating is on the one that goes
  const [, away6] = groups[6];
  noted.set(away6, "Only a note, on the half that goes away.");

  const inPairs = new Set(groups.flat());

  // --- everything else ---------------------------------------------------
  const ordinary = rows.filter((row) => !inPairs.has(row.id));
  ordinary.forEach((row, index) => {
    if (index % 4 === 0) {
      rate(row.id, index);
    }
    if (index % 9 === 0) {
      noted.set(row.id, `Note ${index}: ${row.name}.`);
    }
  });

  for (const [id, [theme, fun, fear]] of rated) {
    await db.execute(
      `INSERT INTO user_ratings (id, attraction_id, theme, fun, fear, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, '2025-11-01T00:00:00.000Z', '2025-11-01T00:00:00.000Z')`,
      [`rating-${id}`, id, theme, fun, fear],
    );
  }
  for (const [id, note] of noted) {
    await db.execute(
      `INSERT INTO user_notes (id, attraction_id, note, created_at, updated_at)
       VALUES (?, ?, ?, '2025-11-02T00:00:00.000Z', '2025-11-02T00:00:00.000Z')`,
      [`note-${id}`, id, note],
    );
  }

  // --- manual rankings, as the old Rankings page saved them ---------------
  const typeOf = new Map(rows.map((row) => [row.id, row.attraction_type]));
  const ratedIds = [...rated.keys()].sort();
  const houses = ratedIds.filter((id) => typeOf.get(id) === "house").reverse();
  const zones = ratedIds.filter((id) => typeOf.get(id) === "scare_zone").reverse();
  // Unrated rows can be placed too, and must keep their place.
  const unratedHouse = ordinary.find(
    (row) => row.attraction_type === "house" && !rated.has(row.id),
  );

  const orders: Record<string, string[]> = {
    "houses:all": [
      survivor5,
      ...houses.slice(0, 20),
      away5,
      away0,
      ...(unratedHouse ? [unratedHouse.id] : []),
      survivor0,
      ...houses.slice(20, 40),
    ],
    "scare_zones:all": zones.slice(0, 15),
    "attractions:all": [...houses.slice(0, 8), ...zones.slice(0, 6), away3, survivor3],
    // A per-year scope the app can write; nothing should disturb it.
    "houses:year:2024": houses.slice(0, 5),
  };
  for (const [scope, order] of Object.entries(orders)) {
    const unique = [...new Set(order.filter((id) => typeOf.get(id) !== undefined))];
    for (const [position, id] of unique.entries()) {
      await db.execute(
        `INSERT INTO user_rankings (id, scope, attraction_id, position, created_at, updated_at)
         VALUES (?, ?, ?, ?, '2025-11-03T00:00:00.000Z', '2025-11-03T00:00:00.000Z')`,
        [`rank-${scope}-${id}`, scope, id, position],
      );
    }
  }

  await db.execute(
    "INSERT INTO user_settings (key, value, updated_at) VALUES (?, ?, '2025-11-04T00:00:00.000Z')",
    ["rankings.lastGroup", JSON.stringify("houses")],
  );

  // --- what Admin Mode could add by hand ------------------------------------
  // The shipped dataset carries no media and no characters, so these stand in
  // for ones a person added — including on records 0009 is about to merge.
  const [firstSeason] = await db.select<Array<{ id: string }>>(
    "SELECT id FROM event_years ORDER BY calendar_year DESC, id LIMIT 1",
  );
  const [firstSource] = await db.select<Array<{ id: string }>>(
    "SELECT id FROM sources ORDER BY id LIMIT 1",
  );
  const media: Array<
    [string, string | null, string | null, string, string | null, string | null, string]
  > = [
    [
      "media-poster-away",
      away0,
      null,
      "poster",
      "https://example.invalid/away.jpg",
      null,
      "reference",
    ],
    [
      "media-poster-survivor",
      survivor1,
      null,
      "poster",
      "https://example.invalid/s.jpg",
      null,
      "reference",
    ],
    ["media-local", ordinary[0].id, null, "local_image", null, "media/local-photo.jpg", "local"],
    [
      "media-artwork",
      null,
      firstSeason.id,
      "event_artwork",
      "https://example.invalid/key.jpg",
      null,
      "reference",
    ],
  ];
  for (const [id, attractionId, eventYearId, type, url, localPath, distribution] of media) {
    await db.execute(
      `INSERT INTO media (id, attraction_id, event_year_id, media_type, url, local_path, source_id,
                          attribution, license_notes, distribution, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Universal', 'Referenced, not redistributed.', ?,
               '2025-11-05T00:00:00.000Z', '2025-11-05T00:00:00.000Z')`,
      [id, attractionId, eventYearId, type, url, localPath, firstSource.id, distribution],
    );
  }
  for (const [id, attractionId, name] of [
    ["character-away", away0, "The Caretaker"],
    ["character-survivor", survivor0, "The Caretaker's Daughter"],
  ]) {
    await db.execute(
      `INSERT INTO characters (id, attraction_id, name, description, created_at, updated_at)
       VALUES (?, ?, ?, NULL, '2025-11-05T00:00:00.000Z', '2025-11-05T00:00:00.000Z')`,
      [id, attractionId, name],
    );
  }
}
