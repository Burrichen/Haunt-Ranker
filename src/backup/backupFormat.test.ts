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
    eventYears: [],
    attractions: [],
    attractionParks: [],
    characters: [],
    attractionRelations: [],
    sources: [],
    attractionSources: [],
    eventYearSources: [],
    media: [],
    ratings: [],
    notes: [],
    rankings: [],
    settings: [],
  };
}

function populatedData(): BackupData {
  return {
    ...emptyData(),
    eventYears: [
      {
        id: "y1",
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
        is_sample: 0,
        ...TIMESTAMPS,
      },
    ],
    attractionParks: [{ attraction_id: "a1", park_id: "hollywood" }],
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
    expect(result.summary.totalRows).toBe(4);
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

  it("refuses media that belongs to both an attraction and a year, or to neither", () => {
    const both = populatedData();
    both.media = [
      {
        id: "m1",
        attraction_id: "a1",
        event_year_id: "y1",
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
      /exactly one attraction or one event year/,
    );

    const orphan = populatedData();
    orphan.media = [{ ...both.media[0], attraction_id: null, event_year_id: null }];
    expect(errorsOf(makeFile({ data: orphan }))[0]).toMatch(
      /exactly one attraction or one event year/,
    );
  });

  it("refuses media with neither a url nor a file", () => {
    const data = populatedData();
    data.media = [
      {
        id: "m1",
        attraction_id: "a1",
        event_year_id: null,
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

describe("upgradeBackup", () => {
  // The format is on its first version, so there is nothing real to upgrade
  // yet. These exercise the mechanism itself, so the first format change is
  // a new entry in the table rather than a new code path.
  it("walks the chain until the file is current", () => {
    const upgrades: Record<number, BackupUpgrade> = {
      0: (raw) => ({ ...raw, wasUpgraded: true }),
    };

    const result = upgradeBackup({ formatVersion: 0 }, upgrades);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.raw.wasUpgraded).toBe(true);
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
    expect(summary.counts).toHaveLength(13);
    expect(summary.totalRows).toBe(4);
  });
});

describe("suggestedBackupFileName", () => {
  it("names the file so that backups sort chronologically", () => {
    expect(suggestedBackupFileName(new Date(2026, 8, 18, 14, 32))).toBe(
      "haunt-ranker-backup-2026-09-18-1432.json",
    );
  });
});
