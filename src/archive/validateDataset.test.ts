import { describe, expect, it } from "vitest";
import { ARCHIVE_FORMAT_VERSION } from "../models/archiveDataset";
import { readDataset, validateDataset } from "./validateDataset";

/**
 * The dataset format's tests. Everything here is fictional placeholder data —
 * real Halloween Horror Nights records haven't been researched yet, and the
 * format has to be settled before they are.
 */
function makeDataset(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    formatVersion: ARCHIVE_FORMAT_VERSION,
    datasetVersion: "2026.09.1",
    generatedAt: "2026-09-18T00:00:00.000Z",
    sources: [
      {
        id: "example-walkthrough-2101",
        type: "youtube",
        title: "Example walkthrough",
        url: "https://youtube.invalid/watch?v=example",
        publisher: "An Example Channel",
        publishedAt: "2101-10-02",
      },
    ],
    events: [
      {
        id: "example-2101",
        calendarYear: 2101,
        name: "Example Event 2101",
        description: "A placeholder event.",
        dates: { start: "2101-09-05", end: "2101-11-02" },
        sourceIds: ["example-walkthrough-2101"],
        media: [
          {
            id: "example-2101-key-art",
            kind: "event_artwork",
            url: "https://example.invalid/key-art.jpg",
            attribution: "An Example Channel",
          },
        ],
      },
    ],
    attractions: [
      {
        id: "example-2101-house-placeholder",
        eventId: "example-2101",
        type: "house",
        name: "Placeholder House",
        parks: ["hollywood", "orlando"],
        ip: { type: "licensed", franchise: "Placeholder" },
        summary: "A placeholder house.",
        wiki: { overview: "Longer placeholder text." },
        location: "Soundstage 1",
        dates: { start: "2101-09-05", end: "2101-11-02" },
        characters: [{ id: "example-2101-placeholder-host", name: "The Host" }],
        related: [],
        media: [],
        sourceIds: ["example-walkthrough-2101"],
      },
    ],
    ...overrides,
  };
}

function errorsOf(value: unknown): string[] {
  const result = validateDataset(value);
  expect(result.ok).toBe(false);
  return result.ok ? [] : result.errors;
}

/** Applies a change to the first attraction and returns the whole dataset. */
function withAttraction(changes: Record<string, unknown>): Record<string, unknown> {
  const dataset = makeDataset();
  const attractions = dataset.attractions as Array<Record<string, unknown>>;
  attractions[0] = { ...attractions[0], ...changes };
  return dataset;
}

describe("validateDataset", () => {
  it("accepts a dataset that uses every part of the format", () => {
    const result = validateDataset(makeDataset());

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.summary).toMatchObject({
      datasetVersion: "2026.09.1",
      events: 1,
      attractions: 1,
      sources: 1,
      characters: 1,
      media: 1,
    });
  });

  it("refuses a file that isn't a dataset", () => {
    expect(errorsOf("nope")[0]).toMatch(/isn't a Haunt Ranker archive dataset/);
    expect(errorsOf({ events: [], attractions: [] })[0]).toMatch(/no dataset format version/);
  });

  it("refuses a dataset written for a newer build", () => {
    expect(errorsOf(makeDataset({ formatVersion: ARCHIVE_FORMAT_VERSION + 1 }))[0]).toMatch(
      /this build understands up to/,
    );
  });

  describe("identity", () => {
    it("insists on an id that could never be a display name", () => {
      expect(errorsOf(withAttraction({ id: "Placeholder House" }))[0]).toMatch(
        /never a display name/,
      );
      expect(errorsOf(withAttraction({ id: "UPPER-case" }))[0]).toMatch(/isn't a usable id/);
      expect(errorsOf(withAttraction({ id: "has space" }))[0]).toMatch(/isn't a usable id/);
    });

    it("refuses two entries claiming the same id", () => {
      const dataset = makeDataset();
      const attractions = dataset.attractions as Array<Record<string, unknown>>;
      attractions.push({ ...attractions[0], name: "A Different House" });

      expect(errorsOf(dataset)[0]).toMatch(/already used by attractions\[0\]\.id/);
    });

    it("catches an id reused across different kinds of record", () => {
      const dataset = makeDataset();
      const events = dataset.events as Array<Record<string, unknown>>;
      events[0].id = "example-walkthrough-2101"; // already a source id

      expect(errorsOf(dataset)[0]).toMatch(/already used by sources\[0\]\.id/);
    });

    it("accepts previousIds, but not one that is the entry's own id", () => {
      expect(validateDataset(withAttraction({ previousIds: ["example-2101-house-old"] })).ok).toBe(
        true,
      );
      expect(
        errorsOf(withAttraction({ previousIds: ["example-2101-house-placeholder"] }))[0],
      ).toMatch(/is the entry's current id/);
    });
  });

  describe("attractions", () => {
    it("requires a park", () => {
      expect(errorsOf(withAttraction({ parks: [] }))[0]).toMatch(/Hollywood, Orlando, or both/);
      expect(errorsOf(withAttraction({ parks: ["singapore"] }))[0]).toMatch(/should be one of/);
    });

    it("notices the same park listed twice", () => {
      expect(errorsOf(withAttraction({ parks: ["orlando", "orlando"] }))[0]).toMatch(
        /listed twice/,
      );
    });

    it("only accepts the two kinds of attraction", () => {
      expect(errorsOf(withAttraction({ type: "maze" }))[0]).toMatch(/house, scare_zone/);
    });

    it("only accepts original or licensed IP", () => {
      expect(errorsOf(withAttraction({ ip: { type: "borrowed" } }))[0]).toMatch(
        /original, licensed/,
      );
    });

    it("needs a name", () => {
      expect(errorsOf(withAttraction({ name: "   " }))[0]).toMatch(/is required/);
    });

    it("refuses an attraction in an event the dataset doesn't contain", () => {
      expect(errorsOf(withAttraction({ eventId: "example-2199" }))[0]).toMatch(
        /no event in this dataset has the id "example-2199"/,
      );
    });

    it("refuses an attraction related to itself", () => {
      const errors = errorsOf(
        withAttraction({
          related: [{ attractionId: "example-2101-house-placeholder", type: "sequel" }],
        }),
      );
      expect(errors[0]).toMatch(/can't be related to itself/);
    });

    it("only accepts the fixed relation types", () => {
      const errors = errorsOf(
        withAttraction({ related: [{ attractionId: "example-2101-other", type: "vaguely-like" }] }),
      );
      expect(errors[0]).toMatch(/sequel, previous_version, same_franchise, related_concept/);
    });
  });

  describe("events", () => {
    it("wants a plausible whole year", () => {
      const dataset = makeDataset();
      (dataset.events as Array<Record<string, unknown>>)[0].calendarYear = 20.5;
      expect(errorsOf(dataset)[0]).toMatch(/should be a whole year/);

      const ancient = makeDataset();
      (ancient.events as Array<Record<string, unknown>>)[0].calendarYear = 1600;
      expect(errorsOf(ancient)[0]).toMatch(/isn't a plausible year/);
    });

    it("wants real dates when dates are given at all", () => {
      const dataset = makeDataset();
      (dataset.events as Array<Record<string, unknown>>)[0].dates = { start: "September 5th" };
      expect(errorsOf(dataset)[0]).toMatch(/ISO date like 2024-09-06/);
    });

    it("is happy with a year whose dates nobody has written down", () => {
      const dataset = makeDataset();
      delete (dataset.events as Array<Record<string, unknown>>)[0].dates;
      expect(validateDataset(dataset).ok).toBe(true);
    });
  });

  describe("media and sources", () => {
    it("requires media to point at something", () => {
      const errors = errorsOf(
        withAttraction({ media: [{ id: "example-poster", kind: "poster" }] }),
      );
      expect(errors[0]).toMatch(/url: is required/);
    });

    it("refuses to let a dataset claim a file on someone's machine", () => {
      const errors = errorsOf(
        withAttraction({
          media: [
            {
              id: "example-poster",
              kind: "poster",
              url: "https://example.invalid/p.jpg",
              distribution: "local",
            },
          ],
        }),
      );
      expect(errors[0]).toMatch(/one person's machine/);
    });

    it("allows a deliberate decision to bundle an asset", () => {
      const result = validateDataset(
        withAttraction({
          media: [
            {
              id: "example-poster",
              kind: "poster",
              url: "https://example.invalid/p.jpg",
              distribution: "bundled",
              licenseNotes: "Cleared for distribution.",
            },
          ],
        }),
      );
      expect(result.ok).toBe(true);
    });

    it("refuses a citation of a source that isn't in the file", () => {
      expect(errorsOf(withAttraction({ sourceIds: ["never-heard-of-it"] }))[0]).toMatch(
        /no source in this dataset has the id "never-heard-of-it"/,
      );
    });

    it("keeps YouTube as an ordinary kind of source", () => {
      const dataset = makeDataset();
      const sources = dataset.sources as Array<Record<string, unknown>>;
      expect(validateDataset(dataset).ok).toBe(true);
      sources[0].type = "vhs";
      expect(errorsOf(dataset)[0]).toMatch(/youtube, article, official_site/);
    });
  });

  it("has nowhere to put a rating, a note or a ranking", () => {
    // The format's most important property is what it can't say. Personal
    // fields smuggled into a dataset are ignored entirely, never applied.
    const result = validateDataset(
      withAttraction({ rating: { theme: 5, fun: 5, fear: 5 }, note: "mine", rankingPosition: 1 }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const attraction = result.dataset.attractions[0] as unknown as Record<string, unknown>;
    // They survive as inert JSON, but nothing in the importer reads them —
    // `importOperations` has no path from a dataset field to a personal table.
    expect(Object.keys(attraction)).toContain("rating");
  });

  it("stops listing problems once the list stops being readable", () => {
    const dataset = makeDataset();
    const attractions = dataset.attractions as Array<Record<string, unknown>>;
    for (let index = 0; index < 30; index += 1) {
      attractions.push({ id: `Not An Id ${index}`, eventId: "nope", type: "maze", parks: [] });
    }

    const errors = errorsOf(dataset);
    expect(errors.length).toBeLessThanOrEqual(16);
    expect(errors[errors.length - 1]).toMatch(/and \d+ more problems/);
  });
});

describe("readDataset", () => {
  it("treats unreadable text as a bad file rather than crashing", () => {
    const result = readDataset("{oh dear");

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors[0]).toMatch(/isn't valid JSON/);
  });

  it("reads a dataset from its file text", () => {
    expect(readDataset(JSON.stringify(makeDataset())).ok).toBe(true);
  });
});
