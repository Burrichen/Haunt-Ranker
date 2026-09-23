import { describe, expect, it } from "vitest";
import { BACKUP_FORMAT_VERSION, type BackupData } from "../models/backup";
import {
  readBackup,
  serializeBackup,
  suggestedBackupFileName,
  summarizeBackup,
  upgradeBackup,
  validateBackup,
  type BackupUpgrade,
} from "./backupFormat";

const TIMESTAMPS = {
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

function emptyData(): BackupData {
  return {
    haunts: [],
    venues: [],
    eventYears: [],
    attractions: [],
    attractionParks: [],
    seasonAppearances: [],
    characters: [],
    attractionRelations: [],
    sources: [],
    attractionSources: [],
    eventYearSources: [],
    media: [],
    attractionVenueWiki: [],
    ratings: [],
    notes: [],
    rankings: [],
    settings: [],
    migrationConflicts: [],
  };
}

/** The haunts and venues a migration seeds, as a backup carries them. */
function referenceData(): Pick<BackupData, "haunts" | "venues"> {
  return {
    haunts: [
      {
        id: "hhn",
        name: "Halloween Horror Nights",
        short_name: "HHN",
        description: null,
        ...TIMESTAMPS,
      },
      {
        id: "knotts-scary-farm",
        name: "Knott's Scary Farm",
        short_name: "Knott's",
        description: null,
        ...TIMESTAMPS,
      },
    ],
    venues: [
      { id: "hollywood", name: "Hollywood", haunt_id: "hhn" },
      { id: "orlando", name: "Orlando", haunt_id: "hhn" },
      { id: "knotts-berry-farm", name: "Knott's Berry Farm", haunt_id: "knotts-scary-farm" },
    ],
  };
}

function populatedData(): BackupData {
  return {
    ...emptyData(),
    ...referenceData(),
    eventYears: [
      {
        id: "y1",
        haunt_id: "hhn",
        calendar_year: 2101,
        name: "Shadowfest 2101",
        description: null,
        source_notes: null,
        starts_on: null,
        ends_on: null,
        is_sample: 0,
        ...TIMESTAMPS,
      },
    ],
    attractions: [
      {
        id: "a1",
        event_year_id: "y1",
        attraction_type: "house",
        name: "Moonlight Manor",
        slug: "moonlight-manor",
        variant_name: null,
        ip_type: "original",
        franchise_name: null,
        short_summary: null,
        full_overview: null,
        story_lore: null,
        experience_description: null,
        development_notes: null,
        opening_date: null,
        closing_date: null,
        location_notes: null,
        debut_year: null,
        is_sample: 0,
        ...TIMESTAMPS,
      },
    ],
    attractionParks: [{ attraction_id: "a1", park_id: "hollywood" }],
    seasonAppearances: [
      {
        attraction_id: "a1",
        season_id: "y1",
        notes: null,
        created_at: TIMESTAMPS.created_at,
      },
    ],
    ratings: [{ id: "rt1", attraction_id: "a1", theme: 4.5, fun: 3, fear: 5, ...TIMESTAMPS }],
  };
}

function makeFile(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    appVersion: "0.1.0",
    schemaVersion: 5,
    exportedAt: "2026-09-18T12:00:00.000Z",
    data: populatedData(),
    preferences: {},
    ...overrides,
  };
}

function errorsOf(value: unknown): string[] {
  const result = validateBackup(value);
  expect(result.ok).toBe(false);
  return result.ok ? [] : result.errors;
}

describe("validateBackup", () => {
  it("accepts a backup this version wrote", () => {
    const result = validateBackup(makeFile());

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.backup.data.attractions[0].name).toBe("Moonlight Manor");
    expect(result.summary.totalRows).toBe(10);
  });

  it("refuses anything that isn't a backup at all", () => {
    expect(errorsOf("just a string")[0]).toMatch(/isn't a Haunt Ranker backup/);
    expect(errorsOf({ some: "object" })[0]).toMatch(/no backup format version/);
  });

  it("refuses a backup from a newer version rather than guessing at it", () => {
    const errors = errorsOf(makeFile({ formatVersion: BACKUP_FORMAT_VERSION + 1 }));

    expect(errors[0]).toMatch(/newer version of Haunt Ranker/);
    expect(errors[0]).toContain(String(BACKUP_FORMAT_VERSION));
  });

  it("refuses a file with a missing table", () => {
    const file = makeFile();
    const data = { ...(file.data as BackupData) } as Partial<BackupData>;
    delete data.rankings;

    expect(errorsOf({ ...file, data })).toContain(
      '"rankings" is missing or is not a list of rows.',
    );
  });

  it("refuses a row whose columns are the wrong type", () => {
    const data = populatedData();
    (data.attractions[0] as unknown as Record<string, unknown>).name = 42;

    expect(errorsOf(makeFile({ data }))).toContain(
      "attractions[0].name should be text, got number.",
    );
  });

  it("refuses a value outside a fixed set", () => {
    const data = populatedData();
    (data.attractions[0] as unknown as Record<string, unknown>).attraction_type = "maze";

    expect(errorsOf(makeFile({ data }))[0]).toMatch(
      /attraction_type should be one of house, scare_zone/,
    );
  });

  it("refuses a park that isn't one of the two", () => {
    const data = populatedData();
    (data.attractionParks[0] as unknown as Record<string, unknown>).park_id = "singapore";

    expect(errorsOf(makeFile({ data }))[0]).toMatch(/park_id should be one of hollywood, orlando/);
  });

  it("refuses a rating that isn't a real score", () => {
    const data = populatedData();
    data.ratings[0].theme = 4.25;

    expect(errorsOf(makeFile({ data }))).toContain("ratings[0].theme is out of range: 4.25.");

    const tooHigh = populatedData();
    tooHigh.ratings[0].fear = 7;
    expect(errorsOf(makeFile({ data: tooHigh }))).toContain("ratings[0].fear is out of range: 7.");
  });

  it("refuses a rating attached to an attraction the backup doesn't contain", () => {
    const data = populatedData();
    data.ratings[0].attraction_id = "ghost";

    expect(errorsOf(makeFile({ data }))).toContain(
      'ratings[0].attraction_id points at "ghost", which isn\'t in this backup.',
    );
  });

  it("refuses two rows sharing an id", () => {
    const data = populatedData();
    data.attractions.push({ ...data.attractions[0] });

    expect(errorsOf(makeFile({ data }))).toContain(
      'attractions contains two rows with the id "a1".',
    );
  });

  it("refuses media that belongs to more than one owner, or to none", () => {
    const both = populatedData();
    both.media = [
      {
        id: "m1",
        attraction_id: "a1",
        event_year_id: "y1",
        haunt_id: null,
        media_type: "poster",
        url: "https://example.invalid/p.jpg",
        local_path: null,
        source_id: null,
        attribution: null,
        license_notes: null,
        distribution: "reference",
        ...TIMESTAMPS,
      },
    ];
    expect(errorsOf(makeFile({ data: both }))[0]).toMatch(
      /exactly one attraction, season or haunt/,
    );

    const orphan = populatedData();
    orphan.media = [{ ...both.media[0], attraction_id: null, event_year_id: null }];
    expect(errorsOf(makeFile({ data: orphan }))[0]).toMatch(
      /exactly one attraction, season or haunt/,
    );

    // A haunt is the third owner a media item can have, and no more of a
    // second one than a year is.
    const hauntAndAttraction = populatedData();
    hauntAndAttraction.media = [{ ...both.media[0], event_year_id: null, haunt_id: "hhn" }];
    expect(errorsOf(makeFile({ data: hauntAndAttraction }))[0]).toMatch(
      /exactly one attraction, season or haunt/,
    );

    const hauntOnly = populatedData();
    hauntOnly.media = [
      { ...both.media[0], attraction_id: null, event_year_id: null, haunt_id: "hhn" },
    ];
    expect(validateBackup(makeFile({ data: hauntOnly })).ok).toBe(true);
  });

  it("refuses media with neither a url nor a file", () => {
    const data = populatedData();
    data.media = [
      {
        id: "m1",
        attraction_id: "a1",
        event_year_id: null,
        haunt_id: null,
        media_type: "poster",
        url: null,
        local_path: null,
        source_id: null,
        attribution: null,
        license_notes: null,
        distribution: "reference",
        ...TIMESTAMPS,
      },
    ];

    expect(errorsOf(makeFile({ data }))[0]).toMatch(/needs either a url or a local_path/);
  });

  it("drops columns it doesn't know about instead of passing them to SQL", () => {
    const data = populatedData();
    (data.attractions[0] as unknown as Record<string, unknown>).injected = "DROP TABLE attractions";

    const result = validateBackup(makeFile({ data }));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.backup.data.attractions[0]).not.toHaveProperty("injected");
  });

  it("stops listing problems once the list stops being readable", () => {
    const data = populatedData();
    for (let index = 0; index < 40; index += 1) {
      data.characters.push({
        id: `c${index}`,
        attraction_id: "nobody",
        name: "Unnamed",
        description: null,
        ...TIMESTAMPS,
      });
    }

    const errors = errorsOf(makeFile({ data }));
    expect(errors.length).toBeLessThan(20);
    expect(errors[errors.length - 1]).toMatch(/and \d+ more problems/);
  });

  it("keeps preferences it recognises and ignores the rest", () => {
    const result = validateBackup(
      makeFile({
        preferences: {
          ambientEffects: false,
          motion: "reduce",
          attractionViewMode: "compact",
          adminMode: true,
        },
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.backup.preferences).toEqual({
      ambientEffects: false,
      motion: "reduce",
      attractionViewMode: "compact",
    });
  });
});

describe("readBackup", () => {
  it("treats unreadable text as a corrupt backup, not a crash", () => {
    const result = readBackup("{not json");

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors[0]).toMatch(/isn't valid JSON/);
  });

  it("reads back exactly what serializeBackup wrote", () => {
    const original = makeFile();
    const parsed = readBackup(serializeBackup(original as never));

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    expect(parsed.backup.data).toEqual(original.data);
  });
});

/**
 * A backup as version 1 wrote them: no haunts, no venues, no appearances,
 * and every season implicitly Halloween Horror Nights.
 */
function version1File(): Record<string, unknown> {
  return {
    formatVersion: 1,
    appVersion: "0.2.0",
    schemaVersion: 7,
    exportedAt: "2026-09-18T12:00:00.000Z",
    data: {
      eventYears: [
        {
          id: "y1",
          calendar_year: 2024,
          name: "Halloween Horror Nights 2024",
          description: null,
          source_notes: null,
          starts_on: null,
          ends_on: null,
          is_sample: 0,
          ...TIMESTAMPS,
        },
      ],
      attractions: [
        {
          id: "a1",
          event_year_id: "y1",
          attraction_type: "house",
          name: "Moonlight Manor",
          slug: "moonlight-manor",
          variant_name: null,
          ip_type: "original",
          franchise_name: null,
          short_summary: null,
          full_overview: null,
          story_lore: null,
          experience_description: null,
          development_notes: null,
          opening_date: null,
          closing_date: null,
          location_notes: null,
          is_sample: 0,
          ...TIMESTAMPS,
        },
      ],
      attractionParks: [{ attraction_id: "a1", park_id: "orlando" }],
      characters: [],
      attractionRelations: [],
      sources: [],
      attractionSources: [],
      eventYearSources: [],
      media: [],
      ratings: [{ id: "rt1", attraction_id: "a1", theme: 5, fun: 4, fear: 3, ...TIMESTAMPS }],
      notes: [{ id: "n1", attraction_id: "a1", note: "Best of the year.", ...TIMESTAMPS }],
      rankings: [{ id: "rk1", scope: "house", attraction_id: "a1", position: 1, ...TIMESTAMPS }],
      settings: [],
    },
    preferences: { ambientEffects: true },
  };
}

describe("upgradeBackup", () => {
  it("walks the chain until the file is current", () => {
    const upgrades: Record<number, BackupUpgrade> = {
      0: (raw) => ({ ...raw, wasUpgraded: true }),
      1: (raw) => ({ ...raw, wasUpgradedAgain: true }),
    };

    const result = upgradeBackup({ formatVersion: 0 }, upgrades);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.raw.wasUpgraded).toBe(true);
    expect(result.raw.wasUpgradedAgain).toBe(true);
    expect(result.raw.formatVersion).toBe(BACKUP_FORMAT_VERSION);
  });

  it("says so rather than reading an old file as though nothing had changed", () => {
    const result = upgradeBackup({ formatVersion: 0 }, {});

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error).toMatch(/format version 0, which this version of Haunt Ranker/);
  });

  it("leaves a current file alone", () => {
    const file = makeFile();
    const result = upgradeBackup(file);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.raw).toBe(file);
  });
});

describe("a version 1 backup", () => {
  it("still imports, through the upgrade rather than around it", () => {
    const result = validateBackup(version1File());

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.backup.formatVersion).toBe(BACKUP_FORMAT_VERSION);
  });

  it("keeps every rating, note and ranking position it carried", () => {
    const result = validateBackup(version1File());
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.backup.data.ratings).toEqual([
      { id: "rt1", attraction_id: "a1", theme: 5, fun: 4, fear: 3, ...TIMESTAMPS },
    ]);
    expect(result.backup.data.notes[0].note).toBe("Best of the year.");
    expect(result.backup.data.rankings[0]).toMatchObject({ scope: "house", position: 1 });
    expect(result.backup.preferences.ambientEffects).toBe(true);
  });

  it("reads its seasons as Halloween Horror Nights, because that is all it held", () => {
    const result = validateBackup(version1File());
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.backup.data.haunts.map((haunt) => haunt.id)).toEqual([
      "hhn",
      "knotts-scary-farm",
    ]);
    expect(result.backup.data.eventYears[0].haunt_id).toBe("hhn");
    expect(result.backup.data.venues.map((venue) => venue.id)).toContain("knotts-berry-farm");
  });

  it("recovers each attraction's appearance from the season it belonged to", () => {
    const result = validateBackup(version1File());
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.backup.data.seasonAppearances).toEqual([
      { attraction_id: "a1", season_id: "y1", notes: null, created_at: TIMESTAMPS.created_at },
    ]);
  });

  it("invents nothing it wasn't told", () => {
    const result = validateBackup(version1File());
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    // A version 1 file says nothing about debut years or venue-specific
    // sections, and a guess would be indistinguishable from a fact.
    expect(result.backup.data.attractions[0].debut_year).toBeNull();
    expect(result.backup.data.attractionVenueWiki).toEqual([]);
    expect(result.backup.data.migrationConflicts).toEqual([]);
  });
});

describe("summarizeBackup", () => {
  it("counts every table, not just a headline total", () => {
    const result = validateBackup(makeFile());
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const summary = summarizeBackup(result.backup);
    const byKey = new Map(summary.counts.map((entry) => [entry.key, entry.count]));

    expect(byKey.get("attractions")).toBe(1);
    expect(byKey.get("ratings")).toBe(1);
    expect(byKey.get("notes")).toBe(0);
    expect(summary.counts).toHaveLength(18);
    expect(summary.totalRows).toBe(10);
  });
});

describe("suggestedBackupFileName", () => {
  it("names the file so that backups sort chronologically", () => {
    expect(suggestedBackupFileName(new Date(2026, 8, 18, 14, 32))).toBe(
      "haunt-ranker-backup-2026-09-18-1432.json",
    );
  });
});
